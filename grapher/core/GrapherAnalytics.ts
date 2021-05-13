import { findDOMParent } from "../../clientUtils/Util"

const DEBUG = false

declare let window: any

// Docs on GA's event interface: https://developers.google.com/analytics/devguides/collection/analyticsjs/events
interface GAEvent {
    hitType: string
    eventCategory: string
    eventAction: string
    eventLabel?: string
    eventValue?: number
}

enum Categories {
    GrapherError = "GrapherErrors",
    GrapherUsage = "GrapherUsage",
    GlobalEntitySelectorUsage = "GlobalEntitySelector",
    SiteClick = "SiteClick",
    KeyboardShortcut = "KeyboardShortcut",
}

enum EventNames {
    grapherViewError = "GRAPHER_VIEW_ERROR",
    entitiesNotFound = "ENTITIES_NOT_FOUND",
    timelinePlay = "TimelinePlay",
}

type entityControlEvent = "open" | "change" | "close"
type countrySelectorEvent =
    | "enter"
    | "select"
    | "deselect"
    | "sortBy"
    | "sortOrder"

// Note: consent-based blocking dealt with at the Google Tag Manager level.
// Events are discarded if consent not given.
export class GrapherAnalytics {
    constructor(environment: string = "", version = "1.0.0") {
        this.isDev = environment === "development"
        this.version = version
    }

    private version: string // Ideally the Git hash commit
    private isDev: boolean

    logGrapherViewError(error: any, info: any): void {
        this.logToAmplitude(EventNames.grapherViewError, { error, info })
        this.logToGA(Categories.GrapherError, EventNames.grapherViewError)
    }

    logEntitiesNotFoundError(entities: string[]): void {
        this.logToAmplitude(EventNames.entitiesNotFound, { entities })
        this.logToGA(
            Categories.GrapherError,
            EventNames.entitiesNotFound,
            JSON.stringify(entities)
        )
    }

    logGrapherTimelinePlay(slug?: string): void {
        this.logToGA(Categories.GrapherUsage, EventNames.timelinePlay, slug)
    }

    logGlobalEntitySelector(action: entityControlEvent, note?: string): void {
        this.logToGA(Categories.GlobalEntitySelectorUsage, action, note)
    }

    logEntityPickerEvent(
        pickerSlug: string,
        action: countrySelectorEvent,
        note?: string
    ): void {
        this.logToGA(`${pickerSlug}ExplorerCountrySelectorUsage`, action, note)
    }

    logSiteClick(action: string = "unknown-action", label: string): void {
        this.logToGA(Categories.SiteClick, action, label)
    }

    logKeyboardShortcut(shortcut: string, combo: string): void {
        this.logToGA(Categories.KeyboardShortcut, shortcut, combo)
    }

    startClickTracking(): void {
        // Todo: add a Story and tests for this OR even better remove and use Google Tag Manager or similar fully SAAS tracking.
        // Todo: have different Attributes for Grapher charts vs Site.
        const dataTrackAttr = "data-track-note"
        document.addEventListener("click", async (ev) => {
            const targetElement = ev.target as HTMLElement
            const trackedElement = findDOMParent(
                targetElement,
                (el: HTMLElement) => el.getAttribute(dataTrackAttr) !== null
            )
            if (!trackedElement) return

            // Note that browsers will cancel all pending requests once a user
            // navigates away from a page. An earlier implementation had a
            // timeout to send the event before navigating, but it broke
            // CMD+CLICK for opening a new tab.
            this.logSiteClick(
                trackedElement.getAttribute(dataTrackAttr) || undefined,
                trackedElement.innerText
            )
        })
    }

    protected logToAmplitude(name: string, props?: any): void {
        const allProps = {
            context: {
                siteVersion: this.version,
                pageHref: window.location.href,
                pagePath: window.location.pathname,
                pageTitle: document.title.replace(/ - [^-]+/, ""),
            },
            ...props,
        }

        if (DEBUG && this.isDev) {
            // eslint-disable-next-line no-console
            console.log("Analytics.logToAmplitude", name, allProps)
            return
        }

        if (!window.amplitude) return
        window.amplitude.getInstance().logEvent(name, allProps)
    }

    protected logToGA(
        eventCategory: string,
        eventAction: string,
        eventLabel?: string,
        eventValue?: number
    ): void {
        // Todo: send the Grapher (or site) version to Git
        const event: GAEvent = {
            hitType: "event",
            eventCategory,
            eventAction,
            eventLabel,
            eventValue,
        }
        if (DEBUG && this.isDev) {
            // eslint-disable-next-line no-console
            console.log("Analytics.logToGA", event)
            return
        }

        if (!window.ga) return

        // https://developers.google.com/analytics/devguides/collection/analyticsjs/ga-object-methods-reference
        window.ga(function () {
            const tracker = window.ga.getAll()[0]
            // @types/google.analytics seems to suggest this usage is invalid but we know Google
            // Analytics logs these events correctly.
            // I have avoided changing the implementation for now, but we should look into this as
            // we use Google Analytics more.
            // -@danielgavrilov 2020-04-23
            if (tracker) tracker.send(event as any)
        })
    }
}
