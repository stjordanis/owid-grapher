import { scaleLog, scaleLinear, ScaleLinear, ScaleLogarithmic } from "d3-scale"
import { observable, computed } from "mobx"
import {
    rollingMap,
    min,
    isMobile,
    uniq,
    sortBy,
    maxBy,
} from "../../clientUtils/Util"
import { Bounds, DEFAULT_BOUNDS } from "../../clientUtils/Bounds"
import { TextWrap } from "../text/TextWrap"
import { AxisConfig } from "./AxisConfig"
import { CoreColumn } from "../../coreTable/CoreTableColumns"
import { ValueRange } from "../../coreTable/CoreTableConstants"
import { ScaleType } from "../../clientUtils/owidTypes"
import { TickFormattingOptions } from "../../clientUtils/formatValue"

interface Tickmark {
    value: number
    priority: number
    faint?: boolean
    gridLineOnly?: boolean
    isFirstOrLastTick?: boolean
}

interface TickPlacement {
    tick: number
    bounds: Bounds
    isHidden: boolean
}
abstract class AbstractAxis {
    config: AxisConfig
    @observable.ref domain: ValueRange
    @observable formatColumn?: CoreColumn // Pass the column purely for formatting reasons. Might be a better way to do this.
    @observable hideFractionalTicks = false
    @observable hideGridlines = false
    @observable.struct range: ValueRange = [0, 0]
    @observable private _scaleType?: ScaleType
    @observable private _label?: string

    constructor(config: AxisConfig) {
        this.config = config
        this.domain = [config.domain[0], config.domain[1]]
    }

    @computed get hideAxis(): boolean {
        return this.config.hideAxis
    }

    // This will expand the domain but never shrink.
    // This will change the min unless the user's min setting is less
    // This will change the max unless the user's max setting is greater
    // Undefined values are ignored
    updateDomainPreservingUserSettings(
        domain: [number | undefined, number | undefined]
    ): this {
        this.domain = [
            domain[0] !== undefined
                ? Math.min(this.domain[0], domain[0])
                : this.domain[0],
            domain[1] !== undefined
                ? Math.max(this.domain[1], domain[1])
                : this.domain[1],
        ]
        return this
    }

    @computed get fontSize(): number {
        return this.config.fontSize
    }

    @computed get scaleType(): ScaleType {
        return this._scaleType ?? (this.config.scaleType || ScaleType.linear)
    }

    set scaleType(value: ScaleType) {
        this._scaleType = value
    }

    @computed get label(): string {
        return this._label ?? this.config.label
    }

    set label(value: string) {
        this._label = value
    }

    @computed get canChangeScaleType(): boolean | undefined {
        return this.config.canChangeScaleType
    }

    // todo: refactor. switch to a parent pattern?
    _update(parentAxis: AbstractAxis): this {
        this.formatColumn = parentAxis.formatColumn
        this.domain = parentAxis.domain.slice() as ValueRange
        this.hideFractionalTicks = parentAxis.hideFractionalTicks
        this.hideGridlines = parentAxis.hideGridlines
        this.range = parentAxis.range.slice() as ValueRange
        this._scaleType = parentAxis._scaleType
        this._label = parentAxis._label
        return this
    }

    @computed private get d3_scale():
        | ScaleLinear<number, number>
        | ScaleLogarithmic<number, number> {
        const d3Scale =
            this.scaleType === ScaleType.log ? scaleLog : scaleLinear
        return d3Scale().domain(this.domain).range(this.range)
    }

    @computed get rangeSize(): number {
        return Math.abs(this.range[1] - this.range[0])
    }

    @computed get rangeMax(): number {
        return Math.max(this.range[1], this.range[0])
    }

    @computed get rangeMin(): number {
        return Math.min(this.range[1], this.range[0])
    }

    // When this is a log axis, only show so many grid lines because otherwise the chart would get
    // too overwhelming. Different for mobile because screens are usually smaller.
    @computed private get maxLogLines(): number {
        return isMobile() ? 8 : 10
    }

    getTickValues(): Tickmark[] {
        const { scaleType, d3_scale, maxLogLines } = this

        let ticks: Tickmark[]
        if (scaleType === ScaleType.log) {
            // This is a wild heuristic that decides how many tick lines and grid lines we want to
            // show for log charts.
            //
            // It tries to achive multiple goals:
            // * make it obvious for the user which values they're looking at
            // * ideally, make it very clear that this is a log axis by looking like log paper
            // * (but) don't overwhelm the user
            // * avoid cases where only one tick is shown for the whole axis (we had those!)
            //
            // This code roughly works as follows:
            // First, we let d3 generate ticks for the axis. d3 gives values of the form `y * 10^x`,
            // with 0 < y < 10.
            // We then assign priorities to these values:
            // * priority 1 (highest) to values of the form `1 * 10^x` (e.g. 100)
            // * priority 2 to values of the form `2 * 10^x` or `5 * 10^x` (e.g. 5, 2000)
            // * priority 3 (lowest) to all other ("in-between") values (e.g. 70, 300)
            //
            // We then decide depending on the number of tick candidates what to do:
            // * if we have less than `maxLogLines`, just show all
            // * if we have betwenn `maxLogLines` and `2 * maxLogLines`, show all "in-between" lines
            //   as faint grid lines without labels to give the chart that log paper look.
            //   We also show all priority 1 and 2 lines with labels, because there aren't too many
            //   of them.
            // * otherwise, remove priority 3 and, if necessary, priority 2 labels until we're below
            //   `maxLogLines` labels overall
            //
            // -@MarcelGerber, 2020-08-07
            const tickCandidates = d3_scale.ticks(maxLogLines)
            ticks = tickCandidates.map((value): {
                value: number
                priority: number
            } => {
                // 10^x
                if (Math.fround(Math.log10(value)) % 1 === 0)
                    return { value, priority: 1 }
                // 5 * 10^x
                else if (Math.fround(Math.log10(value * 2)) % 1 === 0)
                    return { value, priority: 2 }
                // 2 * 10^x
                else if (Math.fround(Math.log10(value / 2)) % 1 === 0)
                    return { value, priority: 2 }
                return { value, priority: 3 }
            })

            if (ticks.length > maxLogLines) {
                if (ticks.length <= 2 * maxLogLines) {
                    // Convert all "in-between" lines to faint grid lines without labels
                    ticks = ticks.map(
                        (tick): Tickmark => {
                            if (tick.priority === 3)
                                tick = {
                                    ...tick,
                                    faint: true,
                                    gridLineOnly: true,
                                }
                            return tick
                        }
                    )
                } else {
                    // Remove some tickmarks again because the chart would get too overwhelming
                    // otherwise
                    for (let priority = 3; priority > 1; priority--) {
                        if (ticks.length > maxLogLines)
                            ticks = ticks.filter(
                                (tick): boolean => tick.priority < priority
                            )
                    }
                }
            }
        } else {
            // Only use priority 2 here because we want the start / end ticks
            // to be priority 1
            ticks = d3_scale.ticks(6).map((tickValue): {
                value: number
                priority: number
            } => ({
                value: tickValue,
                priority: 2,
            }))
        }

        if (this.hideFractionalTicks)
            ticks = ticks.filter((t): boolean => t.value % 1 === 0)

        return uniq(ticks)
    }

    private getTickFormattingOptions(): TickFormattingOptions {
        // The chart's tick formatting function is used by default to format axis ticks. This means
        // that the chart's `numDecimalPlaces` is also used by default to format the axis ticks.
        //
        // However, the author-specified decimal places are not always appropriate for rendering
        // ticks, because:
        // 1. Subsets of the data may require higher fidelity, e.g. users can use the timeline to
        //    end up in a subset of the dataset where values happen to be much lower than usual.
        // 2. Ticks may be rendered at granularities that may not exist in the data, e.g. the data
        //    may only contain 0 and 1, but we may show ticks in between those values.
        //
        // Therefore, when formatting ticks, we determine the `numDecimalPlaces` automatically, by
        // finding the smallest difference between any pair of ticks and making sure that we have
        // sufficient decimal places to express the difference to the first significant figure (the
        // first non-zero digit).
        //
        // One significant figure is sufficient because we use D3's ticks() and that creates
        // "uniformly-spaced, nicely-rounded values [...] where each value is a power of ten
        // multiplied by 1, 2 or 5"
        // See: https://github.com/d3/d3-array/blob/master/README.md#ticks
        //
        // -@danielgavrilov, 2020-05-27
        const tickValues = this.getTickValues()
        const minDist = min(
            rollingMap(tickValues, (a, b): number =>
                Math.abs(a.value - b.value)
            )
        )
        if (minDist === undefined) return {}

        // Find the decimal places required to reach the first non-zero digit
        const dp = Math.ceil(-Math.log10(minDist))
        if (isFinite(dp) && dp >= 0) return { numDecimalPlaces: dp }

        return {}
    }

    getFormattedTicks(): string[] {
        // todo: pass in first or last?
        return this.getTickValues().map((tickmark): string =>
            this.formatTick(tickmark.value)
        )
    }

    place(value: number): number {
        if (!this.range) {
            console.error(
                "Can't place value on scale without a defined output range"
            )
            return value
        } else if (this.scaleType === ScaleType.log && value <= 0) {
            console.error(`Can't have ${value} which is <= 0 on a log scale`)
            return value
        }
        return parseFloat(this.d3_scale(value).toFixed(1))
    }

    @computed get tickFontSize(): number {
        return 0.9 * this.fontSize
    }

    protected doIntersect(bounds: Bounds, bounds2: Bounds): boolean {
        return bounds.intersects(bounds2)
    }

    @computed get ticks(): number[] {
        const { tickPlacements } = this
        for (let i = 0; i < tickPlacements.length; i++) {
            for (let j = i + 1; j < tickPlacements.length; j++) {
                const t1 = tickPlacements[i],
                    t2 = tickPlacements[j]
                if (t1 === t2 || t1.isHidden || t2.isHidden) continue
                if (this.doIntersect(t1.bounds, t2.bounds)) t2.isHidden = true
            }
        }

        return sortBy(
            tickPlacements
                .filter((t): boolean => !t.isHidden)
                .map((t): number => t.tick)
        )
    }

    formatTick(
        tick: number,
        formattingOptionsOverride?: TickFormattingOptions
    ): string {
        const tickFormattingOptions: TickFormattingOptions = {
            ...this.getTickFormattingOptions(),
            ...formattingOptionsOverride,
        }
        return (
            this.formatColumn?.formatForTick(tick, tickFormattingOptions) ??
            tick.toString()
        )
    }

    // calculates coordinates for ticks, sorted by priority
    @computed private get tickPlacements(): TickPlacement[] {
        return sortBy(this.baseTicks, (tick): number => tick.priority).map(
            (tick): TickPlacement => {
                const bounds = Bounds.forText(
                    this.formatTick(tick.value, {
                        isFirstOrLastTick: tick.isFirstOrLastTick,
                    }),
                    {
                        fontSize: this.tickFontSize,
                    }
                )
                return {
                    tick: tick.value,
                    bounds: bounds.extend(this.placeTick(tick.value, bounds)),
                    isHidden: false,
                }
            }
        )
    }

    @computed get labelFontSize(): number {
        return 0.7 * this.fontSize
    }

    @computed protected get baseTicks(): Tickmark[] {
        return this.getTickValues().filter(
            (tick): boolean => !tick.gridLineOnly
        )
    }

    abstract get labelWidth(): number

    protected abstract placeTick(
        tickValue: number,
        bounds: Bounds
    ): { x: number; y: number }

    @computed get labelTextWrap(): TextWrap | undefined {
        const text = this.label
        return text
            ? new TextWrap({
                  maxWidth: this.labelWidth,
                  fontSize: this.labelFontSize,
                  text,
              })
            : undefined
    }
}

const labelPadding = 5

export class HorizontalAxis extends AbstractAxis {
    // todo: test/refactor
    clone(): HorizontalAxis {
        return new HorizontalAxis(this.config)._update(this)
    }

    @computed get labelOffset(): number {
        return this.labelTextWrap
            ? this.labelTextWrap.height + labelPadding * 2
            : 0
    }

    @computed get labelWidth(): number {
        return this.rangeSize
    }

    @computed get height(): number {
        const { labelOffset } = this
        const firstFormattedTick = this.getFormattedTicks()[0]
        const fontSize = this.tickFontSize

        return (
            Bounds.forText(firstFormattedTick, {
                fontSize,
            }).height +
            labelOffset +
            5
        )
    }

    @computed protected get baseTicks(): Tickmark[] {
        let ticks = this.getTickValues().filter(
            (tick): boolean => !tick.gridLineOnly
        )
        const { domain } = this

        // Make sure the start and end values are present, if they're whole numbers
        const startEndPrio = this.scaleType === ScaleType.log ? 2 : 1
        if (domain[0] % 1 === 0)
            ticks = [
                {
                    value: domain[0],
                    priority: startEndPrio,
                    isFirstOrLastTick: true,
                },
                ...ticks,
            ]
        if (domain[1] % 1 === 0 && this.hideFractionalTicks)
            ticks = [
                ...ticks,
                {
                    value: domain[1],
                    priority: startEndPrio,
                    isFirstOrLastTick: true,
                },
            ]
        return uniq(ticks)
    }

    protected placeTick(
        tickValue: number,
        bounds: Bounds
    ): { x: number; y: number } {
        const { labelOffset } = this
        return {
            x: this.place(tickValue) - bounds.width / 2,
            y: bounds.bottom - labelOffset,
        }
    }

    // Add some padding before checking for intersection
    protected doIntersect(bounds: Bounds, bounds2: Bounds): boolean {
        return bounds.intersects(bounds2.padWidth(-5))
    }
}

export class VerticalAxis extends AbstractAxis {
    @computed get labelWidth(): number {
        return this.height
    }

    // todo: test/refactor
    clone(): VerticalAxis {
        return new VerticalAxis(this.config)._update(this)
    }

    @computed get labelOffset(): number {
        return this.labelTextWrap ? this.labelTextWrap.height + 10 : 0
    }

    @computed get width(): number {
        const { labelOffset } = this
        const longestTick = maxBy(
            this.getFormattedTicks(),
            (tick): any => tick.length
        )
        return (
            Bounds.forText(longestTick, { fontSize: this.tickFontSize }).width +
            labelOffset +
            5
        )
    }

    @computed get height(): number {
        return this.rangeSize
    }

    protected placeTick(tickValue: number): { y: number; x: number } {
        return {
            y: this.place(tickValue),
            // x placement doesn't really matter here, so we're using
            // 1 for simplicity
            x: 1,
        }
    }
}

interface DualAxisProps {
    bounds?: Bounds
    horizontalAxis: HorizontalAxis
    verticalAxis: VerticalAxis
}

// DualAxis has the important task of coordinating two axes so that they work together!
// There is a *two-way dependency* between the bounding size of each axis.
// e.g. if the y axis becomes wider because a label is present, the x axis then has less
// space to work with, and vice versa
export class DualAxis {
    private props: DualAxisProps
    constructor(props: DualAxisProps) {
        this.props = props
    }

    @computed get horizontalAxis(): HorizontalAxis {
        const axis = this.props.horizontalAxis.clone()
        axis.range = this.innerBounds.xRange()
        return axis
    }

    @computed get verticalAxis(): VerticalAxis {
        const axis = this.props.verticalAxis.clone()
        axis.range = this.innerBounds.yRange()
        return axis
    }

    // We calculate an initial height from the range of the input bounds
    @computed private get horizontalAxisHeight(): number {
        const axis = this.props.horizontalAxis.clone()
        axis.range = [0, this.bounds.width]
        return axis.hideAxis ? 0 : axis.height
    }

    // We calculate an initial width from the range of the input bounds
    @computed private get verticalAxisWidth(): number {
        const axis = this.props.verticalAxis.clone()
        axis.range = [0, this.bounds.height]
        return axis.hideAxis ? 0 : axis.width
    }

    // Now we can determine the "true" inner bounds of the dual axis
    @computed get innerBounds(): Bounds {
        return this.bounds
            .padBottom(this.horizontalAxisHeight)
            .padLeft(this.verticalAxisWidth)
    }

    @computed get bounds(): Bounds {
        return this.props.bounds ?? DEFAULT_BOUNDS
    }
}
