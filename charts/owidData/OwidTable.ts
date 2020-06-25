import { OwidVariablesAndEntityKey, EntityMeta } from "./OwidVariableSet"
import { OwidVariable } from "./OwidVariable"
import { slugify, groupBy } from "charts/Util"
import { max, min } from "lodash"
import { computed } from "mobx"

declare type int = number
declare type year = int
declare type color = string
declare type columnName = string // let's be very restrictive on valid column names to start.

interface Row {
    [columnName: string]: any
}

interface OwidRow extends Row {
    entityName: string
    entityCode: string
    entityId: number
    year?: year
    day?: int
    date?: string
    _selected?: boolean
    _filtered?: boolean
    _color?: color
    // _x: boolean
    // _y: boolean
}

interface OwidTripletTable {
    year: DayColumn | YearColumn
    entity: EntityColumn
    value: AbstractColumn
}

interface ColumnSpec {
    slug: columnName
    name: string
}

abstract class AbstractColumn {
    private spec: ColumnSpec
    table: OwidTable

    constructor(table: OwidTable, spec: ColumnSpec) {
        this.table = table
        this.spec = spec
    }

    @computed get name() {
        return this.spec.name ?? this.spec.slug
    }

    @computed get entityNames() {
        return this.rows.map(row => row.entityName)
    }

    @computed get entitiesUniq() {
        return new Set(this.entityNames)
    }

    @computed get years() {
        return this.rows.map(row => (row.year ?? row.day)!)
    }

    @computed private get rows() {
        const slug = this.spec.slug
        return this.table.rows.filter(row => row[name] !== undefined)
    }

    @computed get values() {
        const slug = this.spec.slug
        return this.rows.map(row => row[slug])
    }
}

abstract class AbstractTemporalColumn extends AbstractColumn {}
class DayColumn extends AbstractTemporalColumn {}
class YearColumn extends AbstractTemporalColumn {}
class NumberColumn extends AbstractColumn {}
class StringColumn extends AbstractColumn {}
class EntityColumn extends AbstractColumn {}

abstract class AbstractTable<ROW_TYPE> {
    rows: ROW_TYPE[]
    columnNames: Set<string>
    constructor(rows: ROW_TYPE[], columnNames: Set<string>) {
        this.rows = rows
        this.columnNames = columnNames
    }

    isEmpty() {
        return this.rows.length === 0
    }
}

export class OwidTable extends AbstractTable<OwidRow> {
    @computed get columns() {
        const map = new Map<number, AbstractColumn>()
        this.columnNames.forEach(slug => {
            const id = parseInt(slug.split("-")[0])
            map.set(id, new StringColumn(this, {slug, name: slug))
        })
        return map
    }

    @computed get columnsByName() {
        const columns = this.columns
        const map = new Map<string, AbstractColumn>()
        columns.forEach(col => {
            map.set(col.name, col)
        })
        return map
    }

    printStats() {
        console.log(this.minYear, this.maxYear)
        console.log(this.toDelimited(",", 10))
    }

    toDelimited(delimiter = ",", rowLimit?: number) {
        const cols = Array.from(this.columnNames)
        const header = cols.join(delimiter) + "\n"
        const rows = rowLimit ? this.rows.slice(0, rowLimit) : this.rows
        const body = rows
            .map(row => cols.map(cName => row[cName] ?? "").join(delimiter))
            .join("\n")
        return header + body
    }

    @computed get availableEntities() {
        return Array.from(new Set(this.rows.map(row => row.entityName)))
    }

    // todo: can we remove at some point?
    @computed get entityIdToNameMap() {
        const map = new Map()
        this.rows.forEach(row => {
            map.set(row.entityId, row.entityName)
        })
        return map
    }

    // todo: can we remove at some point?
    @computed get entityNameToIdMap() {
        const map = new Map()
        this.rows.forEach(row => {
            map.set(row.entityName, row.entityId)
        })
        return map
    }

    // todo: can we remove at some point?
    @computed get entityNameToCodeMap() {
        const map = new Map()
        this.rows.forEach(row => {
            map.set(row.entityName, row.entityCode)
        })
        return map
    }

    @computed get maxYear() {
        return max(this.allYears)
    }

    @computed get minYear() {
        return min(this.allYears)
    }

    @computed get allYears() {
        return this.rows.filter(row => row.year).map(row => row.year!)
    }

    @computed get hasDayColumn() {
        return this.columnNames.has("day")
    }

    static fromLegacy(json: OwidVariablesAndEntityKey) {
        let rows: OwidRow[] = []
        const entityMetaById: { [id: string]: EntityMeta } = json.entityKey
        const columnNames = new Set(["entityName", "entityId", "entityCode"])
        for (const key in json.variables) {
            const variable = new OwidVariable(
                json.variables[key]
            ).setEntityNamesAndCodesFromEntityMap(entityMetaById)
            const columnName = variable.id + "-" + slugify(variable.name)
            variable.display.yearIsDay
                ? columnNames.add("day")
                : columnNames.add("year")
            columnNames.add(columnName)
            const newRows = variable.values.map((value, index) => {
                const timePart = variable.display.yearIsDay ? "day" : "year"
                return {
                    [timePart]: variable.years[index],
                    [columnName]: value,
                    entityName: variable.entityNames[index],
                    entityId: variable.entities[index],
                    entityCode: variable.entityCodes[index]
                }
            })
            rows = rows.concat(newRows)
        }
        const groupMap = groupBy(rows, row => {
            const timePart =
                row.year !== undefined ? `year:` + row.year : `day:` + row.day
            return timePart + " " + row.entityName
        })

        const joinedRows = Object.keys(groupMap).map(groupKey =>
            Object.assign({}, ...groupMap[groupKey])
        )

        return new OwidTable(joinedRows, columnNames)
    }
}