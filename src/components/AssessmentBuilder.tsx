'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Edit2, Sparkles, FileUp, Save, CheckCircle, 
  Settings2, Code2, AlignLeft, List, Code, Loader2, X 
} from 'lucide-react';
import { moodleCall } from '@/lib/moodle';

export type QuestionType = 'mcq' | 'short_answer' | 'essay' | 'coding';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[]; // for MCQ
  correctAnswer?: string; // for MCQ, short_answer
  testCases?: TestCase[]; // for coding
  points: number;
}

export interface AssessmentBuilderProps {
  jobId?: number | string;
  passCount?: number | '';
  questionCount?: number | '';
  durationMins?: number | '';
  description?: string;
  onSaveSuccess?: (assessment: any) => void;
}

export default function AssessmentBuilder({
  jobId, passCount, questionCount, durationMins, description, onSaveSuccess
}: AssessmentBuilderProps = {}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [inputMode, setInputMode] = useState<'manual' | 'ai' | 'document'>('manual');
  
  // States for Manual Entry Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qType, setQType] = useState<QuestionType>('mcq');
  const [qText, setQText] = useState('');
  const [qPoints, setQPoints] = useState(10);
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([{ id: 'tc-1', input: '', expectedOutput: '', isHidden: false }]);

  // States for AI / Doc
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to generate unique ID
  const genId = () => Math.random().toString(36).substr(2, 9);

  // Save manual question
  const saveQuestion = () => {
    if (!qText.trim()) return alert('Question text is required');

    const newQ: Question = {
      id: editingId || genId(),
      type: qType,
      text: qText,
      points: qPoints,
    };

    if (qType === 'mcq') {
      const validOptions = mcqOptions.filter(o => o.trim() !== '');
      if (validOptions.length < 2) return alert('At least 2 options required for MCQ');
      newQ.options = validOptions;
      newQ.correctAnswer = correctAnswer || validOptions[0];
    } else if (qType === 'short_answer') {
      newQ.correctAnswer = correctAnswer;
    } else if (qType === 'coding') {
      const validCases = testCases.filter(tc => tc.expectedOutput.trim() !== '');
      if (validCases.length === 0) return alert('At least 1 test case required for Coding questions');
      newQ.testCases = validCases;
    }

    if (editingId) {
      setQuestions(qs => qs.map(q => q.id === editingId ? newQ : q));
    } else {
      setQuestions(qs => [...qs, newQ]);
    }
    resetForm();
  };

  const editQuestion = (q: Question) => {
    setEditingId(q.id);
    setQType(q.type);
    setQText(q.text);
    setQPoints(q.points);
    if (q.type === 'mcq') {
      setMcqOptions(q.options || ['', '', '', '']);
      setCorrectAnswer(q.correctAnswer || '');
    } else if (q.type === 'short_answer') {
      setCorrectAnswer(q.correctAnswer || '');
    } else if (q.type === 'coding') {
      setTestCases(q.testCases || [{ id: genId(), input: '', expectedOutput: '', isHidden: false }]);
    }
    setInputMode('manual');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteQuestion = (id: string) => {
    setQuestions(qs => qs.filter(q => q.id !== id));
  };

  const resetForm = () => {
    setEditingId(null);
    setQType('mcq');
    setQText('');
    setQPoints(10);
    setMcqOptions(['', '', '', '']);
    setCorrectAnswer('');
    setTestCases([{ id: genId(), input: '', expectedOutput: '', isHidden: false }]);
  };

  // Simulate AI Generation
  const handleAIGenerate = () => {
    if (!topic) return alert('Enter a topic');
    setIsGenerating(true);
    setTimeout(() => {
      const dummyQuestions: Question[] = [
        { id: genId(), type: 'mcq', text: `What is the primary use case of ${topic}?`, options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'Option B', points: 10 },
        { id: genId(), type: 'short_answer', text: `Explain the core principles of ${topic} in one sentence.`, correctAnswer: 'It allows scalable computing.', points: 15 },
        { id: genId(), type: 'coding', text: `Write a function to implement ${topic} sorting algorithm.`, testCases: [{ id: genId(), input: '[3,1,2]', expectedOutput: '[1,2,3]', isHidden: false }], points: 30 }
      ];
      setQuestions(qs => [...qs, ...dummyQuestions]);
      setIsGenerating(false);
      setInputMode('manual');
    }, 2500);
  };

  // Simulate Doc Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      setTimeout(() => {
        const dummyQuestions: Question[] = [
          { id: genId(), type: 'essay', text: 'Analyze the case study provided in the document and outline the main architectural flaws.', points: 25 },
          { id: genId(), type: 'mcq', text: 'According to the document, what is the SLA threshold?', options: ['99%', '99.9%', '99.99%', '100%'], correctAnswer: '99.9%', points: 5 },
        ];
        setQuestions(qs => [...qs, ...dummyQuestions]);
        setIsUploading(false);
        setInputMode('manual');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 3000);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAssessment = async () => {
    if (!jobId) {
      const payload = JSON.stringify(questions, null, 2);
      console.log('Final Assessment Payload:', payload);
      alert('Assessment JSON payload generated! Check console for details.\n\n' + payload.slice(0, 200) + '...');
      return;
    }

    setIsSaving(true);
    try {
      const createRes = await moodleCall<any>('local_aurahr_academia_create_assessment', {
        jobid: jobId,
        title: `Technical Test - Job ${jobId}`,
        num_questions: Number(questionCount) || questions.length || 20,
        duration_mins: Number(durationMins) || 60,
        pass_percentage: 60.0,
        ai_topic: description || '',
        questions_json: JSON.stringify(questions)
      });

      const assessData = await moodleCall<any>('local_aurahr_academia_get_assessment', { 
        assessmentid: createRes.id, 
        jobid: jobId 
      });
      
      if (onSaveSuccess) onSaveSuccess(assessData);
    } catch (err) {
      console.error('Failed to save assessment structure:', err);
      alert('Failed to save assessment structure.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Input Mode Tabs */}
      <div className="flex bg-ink/5 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setInputMode('manual')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${inputMode === 'manual' ? 'bg-white shadow-sm text-ink' : 'text-ink/50 hover:text-ink'}`}
        >
          <Settings2 size={16} /> Manual Entry
        </button>
        <button 
          onClick={() => setInputMode('ai')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${inputMode === 'ai' ? 'bg-white shadow-sm text-blue-600' : 'text-ink/50 hover:text-blue-600'}`}
        >
          <Sparkles size={16} /> AI Generation
        </button>
        <button 
          onClick={() => setInputMode('document')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${inputMode === 'document' ? 'bg-white shadow-sm text-sage' : 'text-ink/50 hover:text-sage'}`}
        >
          <FileUp size={16} /> Document Import
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form/Generators */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* MANUAL ENTRY MODE */}
            {inputMode === 'manual' && (
              <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bento-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-xl font-bold text-ink">{editingId ? 'Edit Question' : 'Add New Question'}</h3>
                  {editingId && (
                    <button onClick={resetForm} className="text-sm font-semibold text-ink/40 hover:text-rust flex items-center gap-1">
                      <X size={14} /> Cancel Edit
                    </button>
                  )}
                </div>

                <div className="space-y-5">
                  {/* Question Type */}
                  <div>
                    <label className="block text-sm font-bold text-ink/70 mb-2">Question Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'mcq', label: 'MCQ', icon: <List size={14} /> },
                        { id: 'short_answer', label: 'Short Answer', icon: <AlignLeft size={14} /> },
                        { id: 'essay', label: 'Essay', icon: <FileUp size={14} /> },
                        { id: 'coding', label: 'Coding', icon: <Code size={14} /> },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setQType(t.id as QuestionType)}
                          className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-xl text-xs font-bold transition-all ${
                            qType === t.id ? 'bg-sage/10 border-sage text-sage' : 'bg-white border-ink/10 text-ink/60 hover:bg-ink/5'
                          }`}
                        >
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Text & Points */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-ink/70 mb-2">Question Text</label>
                      <textarea 
                        value={qText} onChange={e => setQText(e.target.value)}
                        placeholder="e.g. What is the time complexity of QuickSort?"
                        className="w-full p-3 bg-white border border-ink/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none h-24"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-sm font-bold text-ink/70 mb-2">Points</label>
                      <input 
                        type="number" value={qPoints} onChange={e => setQPoints(parseInt(e.target.value) || 0)}
                        className="w-full p-3 bg-white border border-ink/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      />
                    </div>
                  </div>

                  {/* Dynamic Fields: MCQ */}
                  {qType === 'mcq' && (
                    <div className="space-y-3 p-4 bg-ink/5 rounded-xl border border-ink/10">
                      <label className="block text-sm font-bold text-ink/70">Options</label>
                      {mcqOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <input 
                            type="radio" name="correct_opt" 
                            checked={correctAnswer === opt && opt !== ''} 
                            onChange={() => setCorrectAnswer(opt)}
                            className="w-4 h-4 text-sage border-ink/20 focus:ring-sage"
                          />
                          <input 
                            type="text" value={opt} 
                            onChange={e => {
                              const newOpts = [...mcqOptions];
                              newOpts[idx] = e.target.value;
                              setMcqOptions(newOpts);
                            }}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 p-2 bg-white border border-ink/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                          />
                        </div>
                      ))}
                      <p className="text-xs text-ink/40 mt-1">Select the radio button to mark the correct answer.</p>
                    </div>
                  )}

                  {/* Dynamic Fields: Short Answer */}
                  {qType === 'short_answer' && (
                    <div className="space-y-2 p-4 bg-ink/5 rounded-xl border border-ink/10">
                      <label className="block text-sm font-bold text-ink/70">Expected / Correct Answer</label>
                      <input 
                        type="text" value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)}
                        placeholder="Keyword or exact phrase..."
                        className="w-full p-3 bg-white border border-ink/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      />
                    </div>
                  )}

                  {/* Dynamic Fields: Coding */}
                  {qType === 'coding' && (
                    <div className="space-y-4 p-4 bg-ink/5 rounded-xl border border-ink/10">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-bold text-ink/70">Test Cases (CodeRunner)</label>
                        <button 
                          onClick={() => setTestCases([...testCases, { id: genId(), input: '', expectedOutput: '', isHidden: false }])}
                          className="text-xs font-bold text-sage hover:text-sage/80 flex items-center gap-1"
                        >
                          <Plus size={12} /> Add Case
                        </button>
                      </div>
                      {testCases.map((tc, idx) => (
                        <div key={tc.id} className="p-3 bg-white border border-ink/10 rounded-lg space-y-3 relative group">
                          {testCases.length > 1 && (
                            <button 
                              onClick={() => setTestCases(testCases.filter(t => t.id !== tc.id))}
                              className="absolute top-2 right-2 text-ink/20 hover:text-rust"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-ink/40 uppercase mb-1">Input (Stdin)</label>
                              <textarea 
                                value={tc.input} onChange={e => {
                                  const newTC = [...testCases];
                                  newTC[idx].input = e.target.value;
                                  setTestCases(newTC);
                                }}
                                className="w-full p-2 bg-ink/5 border border-ink/10 rounded font-mono text-xs focus:outline-none focus:border-sage/50" rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-ink/40 uppercase mb-1">Expected Output</label>
                              <textarea 
                                value={tc.expectedOutput} onChange={e => {
                                  const newTC = [...testCases];
                                  newTC[idx].expectedOutput = e.target.value;
                                  setTestCases(newTC);
                                }}
                                className="w-full p-2 bg-ink/5 border border-ink/10 rounded font-mono text-xs focus:outline-none focus:border-sage/50" rows={2}
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-ink/60 font-medium">
                            <input 
                              type="checkbox" checked={tc.isHidden} 
                              onChange={e => {
                                const newTC = [...testCases];
                                newTC[idx].isHidden = e.target.checked;
                                setTestCases(newTC);
                              }}
                              className="rounded border-ink/20 text-sage focus:ring-sage"
                            />
                            Hidden Test Case (Used for grading, invisible to candidate)
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  <button 
                    onClick={saveQuestion}
                    className="w-full py-3 bg-ink text-cream rounded-xl font-bold shadow-md hover:bg-ink/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> {editingId ? 'Update Question' : 'Add Question'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* AI GENERATION MODE */}
            {inputMode === 'ai' && (
              <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bento-card p-6 border-blue-500/20 bg-blue-50/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600"><Sparkles size={18} /></div>
                  <h3 className="font-serif text-xl font-bold text-ink">AI Topic Generator</h3>
                </div>
                <p className="text-sm text-ink/60 mb-6">
                  Provide a topic, technology, or scenario. Our LLM will generate a balanced set of multiple-choice, short-answer, and coding questions to append to your assessment.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-ink/70 mb-2">Topic or Skill</label>
                    <input 
                      type="text" value={topic} onChange={e => setTopic(e.target.value)}
                      placeholder="e.g. Advanced React Patterns & Hooks"
                      className="w-full p-3 bg-white border border-ink/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  
                  <button 
                    onClick={handleAIGenerate}
                    disabled={isGenerating || !topic}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Generating Questions...</> : <><Sparkles size={18} /> Generate via AI</>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* DOCUMENT IMPORT MODE */}
            {inputMode === 'document' && (
              <motion.div key="doc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bento-card p-6 border-sage/20 bg-sage/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-sage/10 text-sage"><FileUp size={18} /></div>
                  <h3 className="font-serif text-xl font-bold text-ink">Document Import (RAG)</h3>
                </div>
                <p className="text-sm text-ink/60 mb-6">
                  Upload an existing quiz (PDF, DOCX, TXT) or a company case study. The AI will parse the document and extract structured questions automatically.
                </p>
                
                <div 
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors ${
                    isUploading ? 'border-sage bg-sage/5' : 'border-ink/20 hover:border-sage/50 hover:bg-white'
                  }`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3 text-sage">
                      <Loader2 size={32} className="animate-spin" />
                      <p className="font-bold text-sm">Parsing Document & Extracting Data...</p>
                    </div>
                  ) : (
                    <>
                      <FileUp size={32} className="text-ink/30 mb-4" />
                      <p className="font-bold text-ink/80 text-sm mb-1">Click to Upload Document</p>
                      <p className="text-xs text-ink/40 mb-4">Supports PDF, DOCX, TXT (Max 5MB)</p>
                      <input 
                        type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.docx,.txt"
                        className="block w-full text-sm text-ink/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-sage/10 file:text-sage hover:file:bg-sage/20 cursor-pointer max-w-[250px]"
                      />
                    </>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Right Column: Question List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-ink">Assessment Questions</h3>
            <span className="text-xs font-bold text-sage bg-sage/10 px-3 py-1 rounded-full">{questions.length} Total</span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {questions.length === 0 ? (
              <div className="text-center p-8 bg-ink/5 rounded-2xl border border-ink/10 border-dashed">
                <List size={24} className="mx-auto text-ink/20 mb-2" />
                <p className="text-sm font-medium text-ink/40">No questions added yet.</p>
              </div>
            ) : (
              <AnimatePresence>
                {questions.map((q, i) => (
                  <motion.div 
                    key={q.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-4 bg-white border border-ink/10 rounded-2xl shadow-sm hover:shadow-md transition-shadow group relative"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold text-ink/40 uppercase tracking-wider bg-ink/5 px-2 py-0.5 rounded">
                            {q.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                            {q.points} PTS
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-ink line-clamp-2">{i + 1}. {q.text}</p>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => editQuestion(q)} className="p-1.5 text-ink/40 hover:text-blue-600 bg-ink/5 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-ink/40 hover:text-rust bg-ink/5 hover:bg-rust/10 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {questions.length > 0 && (
            <motion.button 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={handleSaveAssessment}
              disabled={isSaving}
              className={`w-full mt-4 py-3 rounded-xl font-bold shadow-lg shadow-sage/20 transition-all flex items-center justify-center gap-2 ${
                isSaving ? 'bg-sage/50 text-white cursor-not-allowed' : 'bg-sage text-white hover:bg-sage/90'
              }`}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? 'Saving...' : 'Save Assessment Structure'}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
