import { Color } from "../../coreTable/CoreTableConstants"
import { OwidTable } from "../../coreTable/OwidTable"
import { SeriesName } from "../core/GrapherConstants"
import { ColorScale } from "../color/ColorScale"
// The idea of this interface is to try and start reusing more code across our Chart classes and make it easier
// for a dev to work on a chart type they haven't touched before if they've worked with another that implements
// this interface.

export interface ChartSeries {
    seriesName: SeriesName
    color: Color
}

export type ChartTableTransformer = (inputTable: OwidTable) => OwidTable

export interface ChartInterface {
    failMessage: string // We require every chart have some fail message(s) to show to the user if something went wrong

    inputTable: OwidTable // Points to the OwidTable coming into the chart. All charts have an inputTable. Standardized as part of the interface as a development aid.
    transformedTable: OwidTable // Points to the OwidTable after the chart has transformed the input table. The chart may add a relative transform, for example. Standardized as part of the interface as a development aid.

    colorScale?: ColorScale

    series: readonly ChartSeries[] // This points to the marks that the chart will render. They don't have to be placed yet. Standardized as part of the interface as a development aid.
    // Todo: should all charts additionally have a placedSeries: ChartPlacedSeries[] getter?

    transformTable: ChartTableTransformer
}
