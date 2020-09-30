import { StackedBarSeries } from "./StackedBarChartConstants"

// This method shift up the Y Values of a Series with Points.
export const stackBars = (seriesArr: StackedBarSeries[]) => {
    seriesArr.forEach((series, seriesIndex) => {
        if (!seriesIndex) return // The first series does not need to be shifted
        series.points.forEach((point, pointIndex) => {
            const pointBelowThisOne =
                seriesArr[seriesIndex - 1].points[pointIndex]
            point.yOffset = pointBelowThisOne.y + pointBelowThisOne.yOffset
        })
    })
}