#! /usr/bin/env jest

import React from "react"
import { Grapher, GrapherProgrammaticInterface } from "../core/Grapher"
import {
    SampleColumnSlugs,
    SynthesizeGDPTable,
} from "../../coreTable/OwidTableSynthesizers"
import { DimensionProperty } from "../core/GrapherConstants"

import { configure, mount } from "enzyme"
import Adapter from "enzyme-adapter-react-16"
configure({ adapter: new Adapter() })

const TestGrapherConfig = (): GrapherProgrammaticInterface => {
    const table = SynthesizeGDPTable({ entityCount: 10 })
    return {
        table,
        selectedEntityNames: table.sampleEntityName(5),
        dimensions: [
            {
                slug: SampleColumnSlugs.GDP,
                property: DimensionProperty.y,
                variableId: SampleColumnSlugs.GDP as any,
            },
        ],
    } as GrapherProgrammaticInterface
}

test("clicking the sources footer changes tabs", () => {
    const mountedGrapher = mount(<Grapher {...TestGrapherConfig} />)
    expect(mountedGrapher.find(".sourcesTab")).toHaveLength(0)
    expect(mountedGrapher.find(".SourcesFooterHTML")).toHaveLength(1)

    const mountedGrapherPostClick = mountedGrapher
        .find(".SourcesFooterHTML")
        .find(".clickable")
        .simulate("click")
        .update()

    expect(mountedGrapherPostClick.find(".sourcesTab")).toHaveLength(1)
})
