import { useEffect, useId, useState } from "react";

const buildSrcDoc = (code, runId) => {
  const escaped = code.replace(/<\/script>/gi, "<\\/script>");
  return `<!doctype html><html><body><div id="app"></div><script>
    const RUN_ID = ${JSON.stringify(runId)};
    const send = (level, args) => {
      try {
        parent.postMessage({ __studyRun: true, runId: RUN_ID, level, args: args.map((a) => {
          try { return typeof a === "object" ? JSON.stringify(a) : String(a); } catch (e) { return String(a); }
        }) }, "*");
      } catch (e) {}
    };
    ["log", "warn", "error", "info"].forEach((level) => {
      const orig = console[level] ? console[level].bind(console) : function () {};
      console[level] = function (...args) { send(level, args); orig(...args); };
    });
    window.onerror = function (message) { send("error", [String(message)]); return true; };
    try {
      ${escaped}
    } catch (err) {
      send("error", [err && err.message ? err.message : String(err)]);
    }
  </script></body></html>`;
};

const RunnableCode = ({ code }) => {
  const runId = useId();
  const [logs, setLogs] = useState([]);
  const [runToken, setRunToken] = useState(0);

  useEffect(() => {
    const handler = (event) => {
      if (event.data && event.data.__studyRun && event.data.runId === runId) {
        setLogs((prev) => [...prev, { level: event.data.level, text: event.data.args.join(" ") }]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [runId]);

  const run = () => {
    setLogs([]);
    setRunToken((t) => t + 1);
  };

  return (
    <div className='study-runnable' role='group' aria-label='Runnable JavaScript snippet'>
      <pre className='study-runnable-code'>
        <code>{code}</code>
      </pre>
      <div className='study-runnable-toolbar'>
        <button type='button' onClick={run} className='study-run-btn'>
          <span aria-hidden='true'>▶</span> Run
        </button>
        <span className='study-runnable-hint'>Runs in a sandboxed frame — safe to experiment.</span>
      </div>
      {runToken > 0 && (
        <iframe
          key={runToken}
          title='JavaScript playground execution frame'
          sandbox='allow-scripts'
          srcDoc={buildSrcDoc(code, runId)}
          className='study-runnable-frame'
        />
      )}
      <div className='study-runnable-output' role='status' aria-live='polite'>
        {logs.length === 0 ? (
          <span className='study-runnable-placeholder'>
            {runToken === 0 ? "Click Run to execute this snippet." : "Running…"}
          </span>
        ) : (
          logs.map((entry, i) => (
            <div key={i} className={`study-log study-log-${entry.level}`}>
              {entry.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RunnableCode;
