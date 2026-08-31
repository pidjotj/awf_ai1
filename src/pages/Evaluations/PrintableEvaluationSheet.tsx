import { format } from "date-fns"
import { EVALUATION_PASS_THRESHOLD } from "@/data/evaluationSheetsRepository"
import type { EvaluationScore, EvaluationSheet } from "@/types/domain"

const SCORE_COLUMNS: EvaluationScore[] = [5, 4, 3, 2, 1, "N/A"]

// No source logo file was supplied — this is a generic placeholder standing in for the real AWF
// emblem shown on the paper form. Swap the <circle>/<path> below for an <image> once you have the asset.
function LogoPlaceholder() {
  return (
    <svg viewBox="0 0 64 64" width="52" height="52" aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#c0392b" stroke="#7f1d1d" strokeWidth="2" />
      <path d="M32 14 L38 30 L54 32 L38 34 L32 50 L26 34 L10 32 L26 30 Z" fill="#fff" />
    </svg>
  )
}

const cellBase: React.CSSProperties = { border: "1px solid #000", padding: "3px 6px", fontSize: 11 }
const labelCell: React.CSSProperties = { ...cellBase, fontWeight: 600, whiteSpace: "nowrap" }
const bannerCell: React.CSSProperties = {
  border: "1px solid #000",
  background: "#4f81bd",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  padding: "5px 8px",
  textAlign: "center",
}
const subHeaderCell: React.CSSProperties = {
  border: "1px solid #000",
  background: "#dce6f1",
  fontWeight: 600,
  fontSize: 11,
  padding: "3px 4px",
  textAlign: "center",
  width: 32,
}
const scoreCell: React.CSSProperties = { ...cellBase, textAlign: "center", width: 32, fontWeight: 700 }
const objectiveCell: React.CSSProperties = { ...cellBase, borderStyle: "dotted", borderColor: "#666" }
const repeatingHatch = "repeating-linear-gradient(45deg, #ddd, #ddd 3px, #fff 3px, #fff 6px)"

function ObjectiveRow({ text, score }: { text: string; score: EvaluationScore }) {
  return (
    <tr>
      <td colSpan={8} style={objectiveCell}>
        {text}
      </td>
      {SCORE_COLUMNS.map((col) => (
        <td key={col} style={scoreCell}>
          {score === col ? "X" : ""}
        </td>
      ))}
    </tr>
  )
}

type PrintableEvaluationSheetProps = { sheet: EvaluationSheet }

/** Print-only replica of the paper "Evaluation Sheet" — rendered hidden on screen, shown via @media print. */
export function PrintableEvaluationSheet({ sheet }: PrintableEvaluationSheetProps) {
  const threshold = EVALUATION_PASS_THRESHOLD[sheet.step]

  return (
    <div className="hidden print:block" style={{ color: "#000", background: "#fff", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ ...cellBase, width: 70, textAlign: "center" }} rowSpan={4}>
              <LogoPlaceholder />
            </td>
            <td colSpan={13} style={{ ...cellBase, textAlign: "center", fontSize: 22, fontWeight: 700, textDecoration: "underline" }}>
              Evaluation Sheet
            </td>
          </tr>
          <tr>
            <td style={labelCell}>Date:</td>
            <td colSpan={9} style={cellBase}>
              {format(new Date(sheet.date), "dd/MM/yyyy")}
            </td>
            <td style={labelCell}>Step:</td>
            <td colSpan={2} style={cellBase}>
              {sheet.step}
            </td>
          </tr>
          <tr>
            <td style={labelCell}>Indonesian Teacher:</td>
            <td colSpan={9} style={cellBase}>
              {sheet.iat}
            </td>
            <td style={labelCell}>Type:</td>
            <td colSpan={2} style={cellBase}>
              {sheet.courseType === "PW" ? "PWL" : sheet.courseType}
            </td>
          </tr>
          <tr>
            <td style={labelCell}>French Teacher:</td>
            <td colSpan={12} style={cellBase}>
              {sheet.ft}
            </td>
          </tr>
          <tr>
            <td style={{ ...cellBase }} />
            <td style={labelCell}>Lesson:</td>
            <td colSpan={12} style={cellBase}>
              {sheet.course}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <tbody>
          <tr>
            <td colSpan={8} rowSpan={2} style={bannerCell}>
              Training Objectives
            </td>
            <td colSpan={SCORE_COLUMNS.length} style={{ ...bannerCell, fontSize: 11 }}>
              Evaluation
            </td>
          </tr>
          <tr>
            {SCORE_COLUMNS.map((col) => (
              <td key={col} style={subHeaderCell}>
                {col}
              </td>
            ))}
          </tr>
          {sheet.objectives.map((row, i) => (
            <ObjectiveRow key={i} text={row.text} score={row.score} />
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12, fontSize: 11 }}>
        <div style={{ fontWeight: 600 }}>Comments:</div>
        <div style={{ border: "1px solid #000", minHeight: 48, padding: 6, marginTop: 2 }}>{sheet.comment}</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <tbody>
          <tr>
            <td colSpan={8} style={bannerCell}>
              AWF Program Ownership
            </td>
            {SCORE_COLUMNS.map((col) => (
              <td key={col} style={subHeaderCell}>
                {col}
              </td>
            ))}
          </tr>
          <ObjectiveRow text="General aeronautic knowledge" score={sheet.programOwnership.generalAeronauticKnowledge} />
          <ObjectiveRow text="Theoretical understanding" score={sheet.programOwnership.theoreticalUnderstanding} />
          <ObjectiveRow text="Practical work understanding" score={sheet.programOwnership.practicalWorkUnderstanding} />
          <ObjectiveRow text="Lesson appropriation" score={sheet.programOwnership.lessonAppropriation} />
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
        <tbody>
          <tr>
            <td colSpan={10} style={{ ...cellBase, fontWeight: 600 }}>
              Average total score
            </td>
            <td colSpan={4} style={{ ...cellBase, textAlign: "center", fontWeight: 700, fontSize: 13 }}>
              {sheet.averageScore.toFixed(1)}
            </td>
          </tr>
          <tr>
            <td colSpan={10} style={{ ...cellBase, fontWeight: 600 }}>
              Lesson passed (average &gt; {threshold})
            </td>
            <td
              style={{
                ...cellBase,
                textAlign: "center",
                fontWeight: 700,
                background: sheet.passed ? undefined : repeatingHatch,
              }}
            >
              {sheet.passed ? "Yes" : ""}
            </td>
            <td
              colSpan={3}
              style={{
                ...cellBase,
                textAlign: "center",
                fontWeight: 700,
                background: sheet.passed ? repeatingHatch : undefined,
              }}
            >
              {sheet.passed ? "" : "No"}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, fontSize: 12 }}>
        <div>IAT Signature: ________________________</div>
        <div>FT Signature: ________________________</div>
      </div>
    </div>
  )
}
