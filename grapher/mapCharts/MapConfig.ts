import { observable } from "mobx"
import { MapProjectionName } from "./MapProjections"
import { ColorScaleConfig } from "../color/ColorScaleConfig"
import { ColumnSlug } from "../../coreTable/CoreTableConstants"
import { LegacyVariableId } from "../../clientUtils/owidTypes"
import {
    Persistable,
    updatePersistables,
    objectWithPersistablesToObject,
    deleteRuntimeAndUnchangedProps,
} from "../persistable/Persistable"
import {
    maxTimeBoundFromJSONOrPositiveInfinity,
    maxTimeToJSON,
} from "../../clientUtils/TimeBounds"
import { trimObject, NoUndefinedValues } from "../../clientUtils/Util"

// MapConfig holds the data and underlying logic needed by MapTab.
// It wraps the map property on ChartConfig.
// TODO: migrate database config & only pass legend props
class MapConfigDefaults {
    @observable columnSlug?: ColumnSlug
    @observable time?: number
    @observable timeTolerance?: number
    @observable hideTimeline?: boolean
    @observable projection = MapProjectionName.World

    @observable colorScale = new ColorScaleConfig()
    // Show the label from colorSchemeLabels in the tooltip instead of the numeric value
    @observable tooltipUseCustomLabels?: boolean = undefined
}

export type MapConfigInterface = MapConfigDefaults

interface MapConfigWithLegacyInterface extends MapConfigInterface {
    variableId?: LegacyVariableId
    targetYear?: number
}

export class MapConfig extends MapConfigDefaults implements Persistable {
    updateFromObject(obj: Partial<MapConfigWithLegacyInterface>): void {
        // Migrate variableIds to columnSlugs
        if (obj.variableId && !obj.columnSlug)
            obj.columnSlug = obj.variableId.toString()

        updatePersistables(this, obj)

        // Migrate "targetYear" to "time"
        // TODO migrate the database property instead
        if (obj.targetYear)
            this.time = maxTimeBoundFromJSONOrPositiveInfinity(obj.targetYear)
        else if (obj.time)
            this.time = maxTimeBoundFromJSONOrPositiveInfinity(obj.time)
    }

    toObject(): NoUndefinedValues<MapConfigWithLegacyInterface> {
        const obj = objectWithPersistablesToObject(
            this
        ) as MapConfigWithLegacyInterface
        deleteRuntimeAndUnchangedProps(obj, new MapConfigDefaults())

        if (obj.time) obj.time = maxTimeToJSON(this.time) as any

        if (obj.columnSlug) {
            // Restore variableId for legacy for now
            obj.variableId = parseInt(obj.columnSlug)
            delete obj.columnSlug
        }

        return trimObject(obj)
    }

    constructor(obj?: Partial<MapConfigWithLegacyInterface>) {
        super()
        if (obj) this.updateFromObject(obj)
    }
}
