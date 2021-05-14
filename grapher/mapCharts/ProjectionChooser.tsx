import * as React from "react"
import { computed, action } from "mobx"
import { observer } from "mobx-react"
import Select, { ValueType } from "react-select"
import { first } from "../../clientUtils/Util"
import { MapProjectionName, MapProjectionLabels } from "./MapProjections"
import {
    asArray,
    getStylesForTargetHeight,
} from "../../clientUtils/react-select"

interface ProjectionChooserEntry {
    label: string
    value: MapProjectionName
}

@observer
export class ProjectionChooser extends React.Component<{
    value: string
    onChange: (value: MapProjectionName) => void
}> {
    @action.bound onChange(selected: ValueType<ProjectionChooserEntry>): void {
        const selectedValue = first(asArray(selected))?.value
        if (selectedValue) this.props.onChange(selectedValue)
    }

    @computed get options(): { value: MapProjectionName; label: string }[] {
        return Object.values(MapProjectionName).map((projectName) => {
            return {
                value: projectName,
                label: MapProjectionLabels[projectName],
            }
        })
    }

    render(): JSX.Element {
        const { value } = this.props

        const style: React.CSSProperties = {
            fontSize: "0.75rem",
            pointerEvents: "auto",
        }

        return (
            <div style={style}>
                <Select
                    options={this.options}
                    onChange={this.onChange}
                    value={this.options.find((opt) => opt.value === value)}
                    menuPlacement="bottom"
                    components={{
                        IndicatorSeparator: null,
                    }}
                    styles={getStylesForTargetHeight(22)}
                    isSearchable={false}
                />
            </div>
        )
    }
}
