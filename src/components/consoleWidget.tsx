import React, { useEffect, useRef } from "react";
import SerialConnectionData from "../common/serialConnectionData";

export default function ConsoleWidget({serialLog}: {serialLog: string}): React.JSX.Element {
    const listRef = useRef(null);

    useEffect(() => {
        let list = listRef.current as unknown as HTMLUListElement
        let scrollTop = list.scrollTop;

        list.scrollTop = list.scrollHeight;

        return () => {
            list.scrollTop = scrollTop;
        }
    })

    return (
        <div className="widget console-widget">
            <span className="title">Console</span>
            <div className="console">
                <ul ref={listRef}>
                    {serialLog.split("\n").slice(-80).map((line) => {
                        return <li>{line}</li>
                    })}
                    <li></li>
                </ul>
            </div>
        </div>
    )
}