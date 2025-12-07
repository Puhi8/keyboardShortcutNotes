import React from "react"

export default function Keyboard({ layout, keyDataState, currentLayer, onSelectKey }) {
   return (
      <div className="keyboard">
         {layout.map((row, rowIndex) => (
            <div className="kb-row" key={rowIndex}>
               {row.map((key, i) => {
                  if (key.spacer) return <div key={i} className="kb-spacer" />
                  if (key.empty) return <div key={i} className={`kb-empty ${key.width || "w1"}`} />
                  const data = keyDataState[key.id] || {
                     label: key.label,
                     notes: {},
                  }
                  const note = data.notes[currentLayer] || {
                     text: "",
                     status: "free",
                  }
                  const lines = (note.text || "").trim().split(/\n/)
                  const prev = row[i - 1]
                  const next = row[i + 1]
                  const mergeLeft = prev && !prev.spacer && !prev.empty && prev.id === key.id
                  const mergeRight = next && !next.spacer && !next.empty && next.id === key.id
                  const findSameId = (rowArr) => rowArr?.find(cell =>
                     cell &&
                     !cell.spacer &&
                     !cell.empty &&
                     cell.id === key.id
                  ) || null

                  const prevRowKey = findSameId(rowIndex > 0 ? layout[rowIndex - 1] : null)
                  const nextRowKey = findSameId(rowIndex < layout.length - 1 ? layout[rowIndex + 1] : null)
                  const mergeTop = prevRowKey && prevRowKey.id === key.id
                  const mergeBottom = nextRowKey && nextRowKey.id === key.id

                  const className =
                     `kb-key ${key.width || "w1"}` +
                     (mergeLeft ? " merge-left" : "") +
                     (mergeRight ? " merge-right" : "") +
                     (mergeTop ? " merge-top" : "") +
                     (mergeBottom ? " merge-bottom" : "")

                  return <button
                     key={key.id}
                     type="button"
                     className={className}
                     data-status={note.status || "free"}
                     onClick={() => onSelectKey(key.id, key.label)}
                  >
                     <div className="kb-key-label">{key.label}</div>
                     <div className="kb-key-main">{(note.text || "").trim().slice(0, 18) || ""}</div>
                     <div className="kb-key-note">{lines.length > 1 ? lines[1].slice(0, 20) : ""}</div>
                     <span className="kb-key-status-dot" />
                  </button>
               })}
            </div>
         ))}
      </div>
   )
}
