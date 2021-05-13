import * as React from "react"
import { computed } from "mobx"
import { observer } from "mobx-react"
import { Bounds, DEFAULT_BOUNDS } from "../../clientUtils/Bounds"
import { VerticalAxis, HorizontalAxis, DualAxis } from "./Axis"
import classNames from "classnames"
import { ScaleType } from "../core/GrapherConstants"

@observer
export class VerticalAxisGridLines extends React.Component<{
    verticalAxis: VerticalAxis
    bounds: Bounds
}> {
    render(): JSX.Element {
        const { bounds, verticalAxis } = this.props
        const axis = verticalAxis.clone()
        axis.range = bounds.yRange()

        return (
            <g className={classNames("AxisGridLines", "horizontalLines")}>
                {axis.getTickValues().map(
                    (t, i): JSX.Element => {
                        const color = t.faint
                            ? "#eee"
                            : t.value === 0
                            ? "#ccc"
                            : "#d3d3d3"

                        return (
                            <line
                                key={i}
                                x1={bounds.left.toFixed(2)}
                                y1={axis.place(t.value)}
                                x2={bounds.right.toFixed(2)}
                                y2={axis.place(t.value)}
                                stroke={color}
                                strokeDasharray={
                                    t.value !== 0 ? "3,2" : undefined
                                }
                            />
                        )
                    }
                )}
            </g>
        )
    }
}

@observer
export class HorizontalAxisGridLines extends React.Component<{
    horizontalAxis: HorizontalAxis
    bounds?: Bounds
}> {
    @computed get bounds(): Bounds {
        return this.props.bounds ?? DEFAULT_BOUNDS
    }

    render(): JSX.Element {
        const { horizontalAxis } = this.props
        const { bounds } = this
        const axis = horizontalAxis.clone()
        axis.range = bounds.xRange()

        return (
            <g className={classNames("AxisGridLines", "verticalLines")}>
                {axis.getTickValues().map(
                    (t, i): JSX.Element => {
                        const color = t.faint
                            ? "#eee"
                            : t.value === 0
                            ? "#ccc"
                            : "#d3d3d3"

                        return (
                            <line
                                key={i}
                                x1={axis.place(t.value)}
                                y1={bounds.bottom.toFixed(2)}
                                x2={axis.place(t.value)}
                                y2={bounds.top.toFixed(2)}
                                stroke={color}
                                strokeDasharray={
                                    t.value !== 0 ? "3,2" : undefined
                                }
                            />
                        )
                    }
                )}
            </g>
        )
    }
}

interface DualAxisViewProps {
    dualAxis: DualAxis
    highlightValue?: { x: number; y: number }
    showTickMarks?: boolean
}

@observer
export class DualAxisComponent extends React.Component<DualAxisViewProps> {
    render(): JSX.Element {
        const { dualAxis, showTickMarks } = this.props
        const { bounds, horizontalAxis, verticalAxis, innerBounds } = dualAxis

        const verticalGridlines = verticalAxis.hideGridlines ? null : (
            <VerticalAxisGridLines
                verticalAxis={verticalAxis}
                bounds={innerBounds}
            />
        )

        const horizontalGridlines = horizontalAxis.hideGridlines ? null : (
            <HorizontalAxisGridLines
                horizontalAxis={horizontalAxis}
                bounds={innerBounds}
            />
        )

        const verticalAxisComponent = verticalAxis.hideAxis ? null : (
            <VerticalAxisComponent
                bounds={bounds}
                verticalAxis={verticalAxis}
            />
        )

        const horizontalAxisComponent = horizontalAxis.hideAxis ? null : (
            <HorizontalAxisComponent
                bounds={bounds}
                axisPosition={innerBounds.bottom}
                axis={horizontalAxis}
                showTickMarks={showTickMarks}
            />
        )

        return (
            <g className="DualAxisView">
                {horizontalAxisComponent}
                {verticalAxisComponent}
                {verticalGridlines}
                {horizontalGridlines}
            </g>
        )
    }
}

@observer
export class VerticalAxisComponent extends React.Component<{
    bounds: Bounds
    verticalAxis: VerticalAxis
}> {
    render(): JSX.Element {
        const { bounds, verticalAxis } = this.props
        const { ticks, labelTextWrap } = verticalAxis
        const textColor = "#666"

        return (
            <g className="VerticalAxis">
                {labelTextWrap &&
                    labelTextWrap.render(
                        -bounds.centerY - labelTextWrap.width / 2,
                        bounds.left,
                        { transform: "rotate(-90)" }
                    )}
                {ticks.map(
                    (tick, i): JSX.Element => (
                        <text
                            key={i}
                            x={(bounds.left + verticalAxis.width - 5).toFixed(
                                2
                            )}
                            y={verticalAxis.place(tick)}
                            fill={textColor}
                            dominantBaseline="middle"
                            textAnchor="end"
                            fontSize={verticalAxis.tickFontSize}
                        >
                            {verticalAxis.formatTick(tick)}
                        </text>
                    )
                )}
            </g>
        )
    }
}

export class HorizontalAxisComponent extends React.Component<{
    bounds: Bounds
    axis: HorizontalAxis
    axisPosition: number
    showTickMarks?: boolean
}> {
    @computed get scaleType(): ScaleType {
        return this.props.axis.scaleType
    }

    set scaleType(scaleType: ScaleType) {
        this.props.axis.config.scaleType = scaleType
    }

    // for scale selector. todo: cleanup
    @computed get bounds(): Bounds {
        const { bounds } = this.props
        return new Bounds(bounds.right, bounds.bottom - 30, 100, 100)
    }

    render(): JSX.Element {
        const { bounds, axis, axisPosition, showTickMarks } = this.props
        const { ticks, labelTextWrap: label, labelOffset } = axis
        const textColor = "#666"

        const tickMarks = showTickMarks ? (
            <AxisTickMarks
                tickMarkTopPosition={axisPosition}
                tickMarkXPositions={ticks.map((tick): number =>
                    axis.place(tick)
                )}
                color="#ccc"
            />
        ) : undefined

        return (
            <g className="HorizontalAxis">
                {label &&
                    label.render(
                        bounds.centerX - label.width / 2,
                        bounds.bottom - label.height
                    )}
                {tickMarks}
                {ticks.map(
                    (tick, i): JSX.Element => {
                        const label = axis.formatTick(tick, {
                            isFirstOrLastTick:
                                i === 0 || i === ticks.length - 1,
                        })
                        const rawXPosition = axis.place(tick)
                        // Ensure the first label does not exceed the chart viewing area
                        const xPosition =
                            i === 0
                                ? Bounds.getRightShiftForMiddleAlignedTextIfNeeded(
                                      label,
                                      axis.tickFontSize,
                                      rawXPosition
                                  ) + rawXPosition
                                : rawXPosition
                        const element = (
                            <text
                                key={i}
                                x={xPosition}
                                y={bounds.bottom - labelOffset}
                                fill={textColor}
                                textAnchor="middle"
                                fontSize={axis.tickFontSize}
                            >
                                {label}
                            </text>
                        )

                        return element
                    }
                )}
            </g>
        )
    }
}

export class AxisTickMarks extends React.Component<{
    tickMarkTopPosition: number
    tickMarkXPositions: number[]
    color: string
}> {
    render(): JSX.Element[] {
        const { tickMarkTopPosition, tickMarkXPositions, color } = this.props
        const tickSize = 4
        const tickBottom = tickMarkTopPosition + tickSize
        return tickMarkXPositions.map(
            (tickMarkPosition, index): JSX.Element => {
                return (
                    <line
                        key={index}
                        x1={tickMarkPosition}
                        y1={tickMarkTopPosition}
                        x2={tickMarkPosition}
                        y2={tickBottom}
                        stroke={color}
                    />
                )
            }
        )
    }
}
