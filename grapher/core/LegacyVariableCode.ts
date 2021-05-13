// todo: remove file

import { observable } from "mobx"
import {
    Persistable,
    updatePersistables,
    objectWithPersistablesToObject,
    deleteRuntimeAndUnchangedProps,
} from "../persistable/Persistable"
import { ColumnSlug, Time } from "../../coreTable/CoreTableConstants"
import { DimensionProperty } from "../core/GrapherConstants"
import { OwidSource } from "../../coreTable/OwidSource"
import {
    LegacyVariableDataTableConfigInteface,
    LegacyVariableDisplayConfigInterface,
} from "../../clientUtils/LegacyVariableDisplayConfigInterface"
import { LegacyVariableId } from "../../clientUtils/owidTypes"

export interface LegacyChartDimensionInterface {
    property: DimensionProperty
    targetYear?: Time
    display?: LegacyVariableDisplayConfigInterface
    variableId: LegacyVariableId
    slug?: ColumnSlug
}

class LegacyVariableDisplayConfigDefaults {
    @observable name?: string = undefined
    @observable unit?: string = undefined
    @observable shortUnit?: string = undefined
    @observable isProjection?: boolean = undefined
    @observable conversionFactor?: number = undefined
    @observable numDecimalPlaces?: number = undefined
    @observable tolerance?: number = undefined
    @observable yearIsDay?: boolean = undefined
    @observable zeroDay?: string = undefined
    @observable entityAnnotationsMap?: string = undefined
    @observable includeInTable? = true
    @observable tableDisplay?: LegacyVariableDataTableConfigInteface
    @observable color?: string = undefined
}

export class LegacyVariableDisplayConfig
    extends LegacyVariableDisplayConfigDefaults
    implements Persistable {
    updateFromObject(
        obj?: Partial<LegacyVariableDisplayConfigInterface>
    ): void {
        if (obj) updatePersistables(this, obj)
    }

    toObject(): LegacyVariableDisplayConfigDefaults {
        return deleteRuntimeAndUnchangedProps(
            objectWithPersistablesToObject(this),
            new LegacyVariableDisplayConfigDefaults()
        )
    }

    constructor(obj?: Partial<LegacyVariableDisplayConfigInterface>) {
        super()
        if (obj) this.updateFromObject(obj)
    }
}

export interface LegacyVariableConfig {
    id: number
    name?: string
    description?: string
    unit?: string
    display?: LegacyVariableDisplayConfigInterface
    shortUnit?: string
    datasetName?: string
    datasetId?: string
    coverage?: string
    source?: OwidSource
    years?: number[]
    entities?: number[]
    values?: (string | number)[]
}

export interface LegacyEntityMeta {
    id: number
    name: string
    code: string
}

declare interface LegacyEntityKey {
    [id: string]: LegacyEntityMeta
}

export interface LegacyVariablesAndEntityKey {
    variables: {
        [id: string]: LegacyVariableConfig
    }
    entityKey: LegacyEntityKey
}
