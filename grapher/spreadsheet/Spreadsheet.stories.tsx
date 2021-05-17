import * as React from "react"
import {
    SampleColumnSlugs,
    SynthesizeGDPTable,
} from "../../coreTable/OwidTableSynthesizers"
import { Spreadsheet } from "./Spreadsheet"
import { action, computed, observable } from "mobx"
import { observer } from "mobx-react"
import { Bounds } from "../../clientUtils/Bounds"
import { ChartTypeName } from "../core/GrapherConstants"
import {
    ChartComponentClassMap,
    DefaultChartClass,
} from "../chart/ChartTypeMap"
import { OwidTableSlugs } from "../../coreTable/OwidTableConstants"
import { ChartTypeSwitcher } from "../chart/ChartTypeSwitcher"

export default {
    title: "Spreadsheet",
    component: Spreadsheet,
}

const getRandomTable = () =>
    SynthesizeGDPTable({
        entityCount: 2,
        timeRange: [2020, 2024],
    })
        .dropColumns([
            SampleColumnSlugs.GDP,
            SampleColumnSlugs.Population,
            OwidTableSlugs.entityCode,
            OwidTableSlugs.entityId,
        ])
        .sortColumns([OwidTableSlugs.entityName, OwidTableSlugs.year])

@observer
class Editor extends React.Component {
    @observable.ref table = getRandomTable()

    @action.bound private shuffleTable() {
        this.table = getRandomTable()
    }

    @computed get yColumnSlugs() {
        return this.table.suggestedYColumnSlugs
    }

    @computed get xColumnSlug() {
        return this.table.timeColumn?.slug
    }

    @observable chartTypeName = ChartTypeName.LineChart

    @computed get selection() {
        return this.table.availableEntityNames
    }

    @action.bound private changeChartType(type: ChartTypeName) {
        this.chartTypeName = type
    }

    render() {
        const ChartClass =
            ChartComponentClassMap.get(this.chartTypeName) ?? DefaultChartClass

        return (
            <div>
                <Spreadsheet manager={this} />
                <svg width={400} height={300}>
                    <ChartClass
                        manager={this}
                        bounds={new Bounds(0, 0, 400, 300)}
                    />
                </svg>
                <button onClick={this.shuffleTable}>Shuffle</button>
                <ChartTypeSwitcher onChange={this.changeChartType} />
            </div>
        )
    }
}

export const Default = () => <Editor />
