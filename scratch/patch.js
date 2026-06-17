const fs = require('fs');
let content = fs.readFileSync('src/app/candidate/test/[id]/page.tsx', 'utf8');

content = content.replace(/function CheckButton\(\{[\s\S]*?\}\s*\)\s*\{[\s\S]*?<\/button>\s*;\s*\}/g, '');

const btnCode = `
function CheckButton({
  label, status, error, icon: Icon, iconFail: IconFail, onClick,
}: {
  label: string; status: CheckStatus; error?: string;
  icon: any; iconFail: any; onClick: () => void;
}) {
  const bg =
    status === 'ok'       ? 'bg-emerald-50 border-emerald-300'   :
    status === 'fail'     ? 'bg-red-50 border-red-300'           :
    status === 'checking' ? 'bg-amber-50 border-amber-300'       :
    'bg-white border-ink/10 hover:bg-ink/5';
  const textColor =
    status === 'ok'       ? 'text-emerald-700' :
    status === 'fail'     ? 'text-red-600'     :
    status === 'checking' ? 'text-amber-700'   : 'text-ink/60';
  const IconComp = status === 'fail' ? IconFail : Icon;
  return (
    <button onClick={onClick} disabled={status === 'checking'}
      className={\`p-5 rounded-2xl border flex flex-col items-center gap-2 transition-all w-full \${bg}\`}
    >
      {status === 'checking'
        ? <Loader2 size={26} className="animate-spin text-amber-600" />
        : <IconComp size={26} className={textColor} />
      }
      <span className={\`text-sm font-semibold text-center \${textColor}\`}>
        {status === 'idle'     ? label                      : ''}
        {status === 'checking' ? 'Checking…'                : ''}
        {status === 'ok'       ? label.replace('Check ', '') + ' ✓' : ''}
        {status === 'fail'     ? 'Retry'                    : ''}
      </span>
      {error && status === 'fail' && (
        <p className="text-xs text-red-500 text-center leading-snug">{error}</p>
      )}
    </button>
  );
}

export default function CandidateTestPage`;

content = content.replace('export default function CandidateTestPage', btnCode);

content = content.replace(/video:\s*\{[\s\S]*?cursor:\s*'always'\s*\}/, 'video: true');

const startOld = `const res = await moodleCall<any>('local_aurahr_proctoring_start_session', {
        assessmentid: assessment.id,
        jobid:        jobId,
        camera_ok:    camCheck.status === 'ok',
        mic_ok:       micCheck.status === 'ok',
        screen_ok:    screenCheck.status === 'ok',
      });
      sessionIdRef.current = res.sessionid;`;
content = content.replace(startOld, "sessionIdRef.current = 'mock-session-' + Date.now();");

const logOld = `await moodleCall('local_aurahr_proctor_log_event', {
          sessionid: sessionIdRef.current,
          event_type: type,
          note: note
        });`;
content = content.replace(logOld, "console.log('Mock violation:', type, note);");

const submitOld = `const res = await moodleCall<any>('local_aurahr_academia_submit_test', {
        assessmentid: assessment.id,
        jobid:        jobId,
        answers:      JSON.stringify(answers),
        violations:   violationCount,
      });
      setFinalScore(res.score);`;
content = content.replace(submitOld, `const answeredCount = Object.keys(answers).length;
      const score = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
      setFinalScore(score);`);

fs.writeFileSync('src/app/candidate/test/[id]/page.tsx', content);
console.log('File patched successfully.');
