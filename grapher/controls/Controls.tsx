import * as React from "react"
import { computed, action } from "mobx"
import { observer } from "mobx-react"
import {
    getQueryParams,
    getWindowQueryParams,
    QueryParams,
} from "../../clientUtils/urls/UrlUtils"
import { TimelineComponent } from "../timeline/TimelineComponent"
import { formatValue } from "../../clientUtils/formatValue"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload"
import { faShareAlt } from "@fortawesome/free-solid-svg-icons/faShareAlt"
import { faExpand } from "@fortawesome/free-solid-svg-icons/faExpand"
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt"
import {
    GrapherTabOption,
    HighlightToggleConfig,
    RelatedQuestionsConfig,
    StackMode,
} from "../core/GrapherConstants"
import { ShareMenu, ShareMenuManager } from "./ShareMenu"
import { TimelineController } from "../timeline/TimelineController"
import { SelectionArray } from "../selection/SelectionArray"

export interface HighlightToggleManager {
    highlightToggle?: HighlightToggleConfig
    selectionArray?: SelectionArray
    populateFromQueryParams: (obj: QueryParams) => void
}

// Todo: Add tests and stories
@observer
export class HighlightToggle extends React.Component<{
    manager: HighlightToggleManager
}> {
    @computed private get manager(): HighlightToggleManager {
        return this.props.manager
    }
    @computed private get highlight(): HighlightToggleConfig | undefined {
        return this.props.manager.highlightToggle
    }

    @computed private get highlightParams(): QueryParams {
        return getQueryParams((this.highlight?.paramStr || "").substring(1))
    }

    @action.bound private onHighlightToggle(
        event: React.FormEvent<HTMLInputElement>
    ): void {
        if (!event.currentTarget.checked) {
            this.manager.selectionArray?.clearSelection()
            return
        }

        const params = {
            ...getWindowQueryParams(),
            ...this.highlightParams,
        }
        this.manager.populateFromQueryParams(params)
    }

    private get isHighlightActive(): boolean {
        const params = getWindowQueryParams()
        let isActive = true
        Object.keys(this.highlightParams).forEach((key): void => {
            if (params[key] !== this.highlightParams[key]) isActive = false
        })
        return isActive
    }

    render(): JSX.Element {
        const { highlight, isHighlightActive } = this
        return (
            <label className="clickable HighlightToggle">
                <input
                    type="checkbox"
                    checked={isHighlightActive}
                    onChange={this.onHighlightToggle}
                />{" "}
                &nbsp;{highlight?.description}
            </label>
        )
    }
}

export interface AbsRelToggleManager {
    stackMode?: StackMode
    relativeToggleLabel?: string
}

@observer
export class AbsRelToggle extends React.Component<{
    manager: AbsRelToggleManager
}> {
    @action.bound onToggle(): void {
        this.manager.stackMode = this.isRelativeMode
            ? StackMode.absolute
            : StackMode.relative
    }

    @computed get isRelativeMode(): boolean {
        return this.manager.stackMode === StackMode.relative
    }

    @computed get manager(): AbsRelToggleManager {
        return this.props.manager
    }

    render(): JSX.Element {
        const label = this.manager.relativeToggleLabel ?? "Relative"
        return (
            <label className="clickable">
                <input
                    type="checkbox"
                    checked={this.isRelativeMode}
                    onChange={this.onToggle}
                    data-track-note="chart-abs-rel-toggle"
                />{" "}
                &nbsp;{label}
            </label>
        )
    }
}

export interface ZoomToggleManager {
    zoomToSelection?: boolean
}

@observer
export class ZoomToggle extends React.Component<{
    manager: ZoomToggleManager
}> {
    @action.bound onToggle(): void {
        this.props.manager.zoomToSelection = this.props.manager.zoomToSelection
            ? undefined
            : true
    }

    render(): JSX.Element {
        const label = "Zoom to selection"
        return (
            <label className="clickable">
                <input
                    type="checkbox"
                    checked={this.props.manager.zoomToSelection}
                    onChange={this.onToggle}
                    data-track-note="chart-zoom-to-selection"
                />{" "}
                {label}
            </label>
        )
    }
}

export interface SmallCountriesFilterManager {
    populationFilterOption?: number
    minPopulationFilter?: number
}

@observer
export class FilterSmallCountriesToggle extends React.Component<{
    manager: SmallCountriesFilterManager
}> {
    @action.bound private onChange(): void {
        this.manager.minPopulationFilter = this.manager.minPopulationFilter
            ? undefined
            : this.filterOption
    }

    @computed private get manager(): SmallCountriesFilterManager {
        return this.props.manager
    }

    @computed private get filterOption(): number {
        return this.manager.populationFilterOption ?? 1e6
    }

    render(): JSX.Element {
        const label = `Hide countries < ${formatValue(
            this.filterOption,
            {}
        )} people`
        return (
            <label className="clickable">
                <input
                    type="checkbox"
                    checked={!!this.manager.minPopulationFilter}
                    onChange={this.onChange}
                    data-track-note="chart-filter-small-countries"
                />{" "}
                &nbsp;{label}
            </label>
        )
    }
}

export interface FooterControlsManager extends ShareMenuManager {
    isShareMenuActive?: boolean
    isSelectingData?: boolean
    availableTabs?: GrapherTabOption[]
    currentTab?: GrapherTabOption
    isInIFrame?: boolean
    canonicalUrl?: string
    hasTimeline?: boolean
    hasRelatedQuestion?: boolean
    relatedQuestions: RelatedQuestionsConfig[]
    footerControlsHeight?: number
    timelineController?: TimelineController
}

@observer
export class FooterControls extends React.Component<{
    manager: FooterControlsManager
}> {
    @computed private get manager(): FooterControlsManager {
        return this.props.manager
    }

    @action.bound onShareMenu(): void {
        this.manager.isShareMenuActive = !this.manager.isShareMenuActive
    }

    @computed private get availableTabs(): GrapherTabOption[] {
        return this.manager.availableTabs || []
    }

    private _getTabsElement(): JSX.Element {
        const { manager } = this
        return (
            <nav className="tabs">
                <ul>
                    {this.availableTabs.map((tabName): JSX.Element | null => {
                        return tabName !== GrapherTabOption.download ? (
                            <li
                                key={tabName}
                                className={
                                    "tab clickable" +
                                    (tabName === manager.currentTab
                                        ? " active"
                                        : "")
                                }
                            >
                                <a
                                    onClick={(): GrapherTabOption =>
                                        (manager.currentTab = tabName)
                                    }
                                    data-track-note={"chart-click-" + tabName}
                                >
                                    {tabName}
                                </a>
                            </li>
                        ) : null
                    })}
                    <li
                        className={
                            "tab clickable icon download-tab-button" +
                            (manager.currentTab === GrapherTabOption.download
                                ? " active"
                                : "")
                        }
                        title="Download as .png or .svg"
                    >
                        <a
                            data-track-note="chart-click-download"
                            onClick={(): GrapherTabOption =>
                                (manager.currentTab = GrapherTabOption.download)
                            }
                        >
                            <FontAwesomeIcon icon={faDownload} /> Download
                        </a>
                    </li>
                    <li className="clickable icon">
                        <a
                            title="Share"
                            onClick={this.onShareMenu}
                            data-track-note="chart-click-share"
                        >
                            <FontAwesomeIcon icon={faShareAlt} />
                        </a>
                    </li>
                    {manager.isInIFrame && (
                        <li className="clickable icon">
                            <a
                                title="Open chart in new tab"
                                href={manager.canonicalUrl}
                                data-track-note="chart-click-newtab"
                                target="_blank"
                                rel="noopener"
                            >
                                <FontAwesomeIcon icon={faExpand} />
                            </a>
                        </li>
                    )}
                </ul>
            </nav>
        )
    }

    render(): JSX.Element {
        const { manager } = this
        const {
            isShareMenuActive,
            hasRelatedQuestion,
            relatedQuestions,
        } = manager
        const tabsElement = (
            <div className="footerRowSingle">{this._getTabsElement()}</div>
        )

        const shareMenuElement = isShareMenuActive && (
            <ShareMenu manager={manager} onDismiss={this.onShareMenu} />
        )

        const relatedQuestionElement = relatedQuestions && hasRelatedQuestion && (
            <div className="relatedQuestion">
                Related:&nbsp;
                <a
                    href={relatedQuestions[0].url}
                    target="_blank"
                    rel="noopener"
                    data-track-note="chart-click-related"
                >
                    {relatedQuestions[0].text}
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                </a>
            </div>
        )

        const timeline = !manager.hasTimeline ? null : (
            <div className="footerRowSingle">
                <TimelineComponent
                    timelineController={this.manager.timelineController!}
                />
            </div>
        )

        return (
            <div
                className={"ControlsFooter"}
                style={{ height: manager.footerControlsHeight ?? 1 }}
            >
                {timeline}
                {tabsElement}
                {shareMenuElement}
                {relatedQuestionElement}
            </div>
        )
    }
}
