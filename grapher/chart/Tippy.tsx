import * as React from "react"
import { default as OriginalTippy, TippyProps } from "@tippyjs/react"

export const Tippy = (props: TippyProps): JSX.Element => (
    <OriginalTippy theme="light" {...props} />
)
