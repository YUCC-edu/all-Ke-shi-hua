import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  Code, 
  Download, 
  Play, 
  LayoutTemplate, 
  FileJson, 
  MessageSquare, 
  Loader2, 
  Maximize2, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Constants ---

type Template = {
  id: string;
  name: string;
  description: string;
  prompt: string;
};

const TEMPLATES: Template[] = [
  {
    id: 'technical',
    name: '技术仪表盘 (Technical Dashboard)',
    description: '专业、精确、信息密集。感觉像任务控制中心或科学仪器。',
    prompt: `
主题：技术仪表盘 / 数据网格
氛围：专业、精确、信息密集。感觉像任务控制中心或科学仪器。
颜色：深色背景 (#141414)，柔和的次要文本，数据使用等宽字体，标题使用斜体衬线字体。
边框：可见的网格边框，虚线。
图表：使用 ECharts 深色主题。颜色应精确且具技术感（如青色、洋红色、黄色、白色）。
排版：数字使用等宽字体，UI 使用无衬线字体，标题使用衬线字体。
`
  },
  {
    id: 'editorial',
    name: '杂志级报告 (Editorial Report)',
    description: '大胆、引人注目、杂志风格。高对比度。',
    prompt: `
主题：编辑 / 杂志主视觉
氛围：大胆、戏剧性、引人注目。感觉像时尚杂志封面或展览海报。
颜色：高对比度。纯黑或纯白背景。大胆的强调色（如暖橙色）。
排版：标题使用巨大的展示型排版（紧凑的行高，负字间距）。微小的全大写标签形成对比。
图表：使用 ECharts。颜色应精致柔和，或使用引人注目的单色强调。
`
  },
  {
    id: 'brutalist',
    name: '粗野主义创意 (Brutalist Creative)',
    description: '打破常规、创意十足、高能量。',
    prompt: `
主题：粗野主义 / 创意工具
氛围：大胆、打破常规、创意十足。感觉像设计工具或实验性界面。
颜色：在粗野黑 (#000000) 或画廊白 (#FFFFFF) 上使用霓虹强调色（如 #00FF00）。
排版：巨大的无衬线数字，全大写标签，粗单线边框。
图表：使用 ECharts。颜色应高对比度、霓虹且大胆。粗线条，无平滑处理。
`
  },
  {
    id: 'minimal',
    name: '极简实用 (Clean Utility)',
    description: '干净、功能性强、值得信赖。极简主义。',
    prompt: `
主题：干净实用 / 极简
氛围：干净、功能性强、值得信赖。感觉像设计精良的实用应用或金融科技产品。
颜色：浅灰色背景 (#f5f5f5)，白色卡片，柔和的次要文本 (#9e9e9e)。
排版：系统字体 (SF Pro, Inter)。大号百分比显示，使用细字重。
边框：大圆角 (24px+)，柔和的阴影。
图表：使用 ECharts。颜色应干净、值得信赖（蓝色、绿色、灰色）。平滑的线条，柔和的面积填充。
`
  }
];

const DEFAULT_DATA = `[
  {"month": "1月", "sales": 4000, "users": 2400, "profit": 2400},
  {"month": "2月", "sales": 3000, "users": 1398, "profit": 2210},
  {"month": "3月", "sales": 2000, "users": 9800, "profit": 2290},
  {"month": "4月", "sales": 2780, "users": 3908, "profit": 2000},
  {"month": "5月", "sales": 1890, "users": 4800, "profit": 2181},
  {"month": "6月", "sales": 2390, "users": 3800, "profit": 2500},
  {"month": "7月", "sales": 3490, "users": 4300, "profit": 2100}
]`;

// --- Main Component ---

export default function App() {
  const [dataInput, setDataInput] = useState(DEFAULT_DATA);
  const [promptInput, setPromptInput] = useState('创建一个仪表盘，展示每月的销售趋势、用户增长情况，以及利润与销售额的对比。');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0].id);
  
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleGenerate = async () => {
    if (!dataInput.trim() || !promptInput.trim()) {
      setError('请提供数据和可视化需求提示词。');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedHtml(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('缺少 Gemini API Key。请在 AI Studio 设置中配置。');
      }

      const ai = new GoogleGenAI({ apiKey });
      const template = TEMPLATES.find(t => t.id === selectedTemplate);

      const systemInstruction = `You are an expert frontend developer and data visualizer building a skill for OpenClaw.
Your task is to generate a SINGLE, standalone HTML file that visualizes the provided data according to the user's request and the specified design template.

CRITICAL REQUIREMENTS:
1. Output MUST be ONLY raw HTML code. Do NOT wrap it in markdown blocks (like \`\`\`html). Do NOT include any conversational text before or after the HTML.
2. The HTML must be completely standalone. It must run locally without a build step.
3. Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
4. Use ECharts via CDN for all charts: <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
5. Embed the provided data directly into the JavaScript within the HTML.
6. Make the layout responsive and beautiful, strictly following the requested design template.
7. Include a title, descriptive text, and multiple charts if appropriate for the prompt.
8. Ensure the ECharts instances are resized correctly when the window resizes.
9. 网页内的所有文本（标题、图表标签、描述等）必须使用中文。
`;

      const userMessage = `
DATA:
${dataInput}

USER REQUEST:
${promptInput}

DESIGN TEMPLATE:
${template?.prompt}

Generate the standalone HTML file now. Remember: ONLY output the raw HTML string, starting with <!DOCTYPE html> and ending with </html>.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: userMessage,
        config: {
          systemInstruction,
          temperature: 0.2,
        }
      });

      let htmlContent = response.text || '';
      
      // Clean up markdown if the model accidentally included it
      if (htmlContent.startsWith('\`\`\`html')) {
        htmlContent = htmlContent.replace(/^\`\`\`html\\n/, '');
      }
      if (htmlContent.startsWith('\`\`\`')) {
        htmlContent = htmlContent.replace(/^\`\`\`\\n/, '');
      }
      if (htmlContent.endsWith('\`\`\`')) {
        htmlContent = htmlContent.replace(/\\n\`\`\`$/, '');
      }

      setGeneratedHtml(htmlContent.trim());
      
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedHtml) return;
    
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openclaw-visualization-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Update iframe content when HTML changes
  useEffect(() => {
    if (iframeRef.current && generatedHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(generatedHtml);
        doc.close();
      }
    }
  }, [generatedHtml]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 px-6 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Code className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white leading-tight">OpenClaw 可视化生成器</h1>
            <p className="text-xs text-neutral-400">通用可视化技能生成工具</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={!generatedHtml || isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium rounded-md transition-colors border border-neutral-700"
          >
            <Download className="w-4 h-4" />
            导出 HTML
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors shadow-lg shadow-indigo-600/20"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isGenerating ? '生成中...' : '生成网页'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Controls */}
        <div className="w-[400px] flex-shrink-0 border-r border-neutral-800 bg-neutral-900/30 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-8">
            
            {/* Data Input */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-neutral-300">
                <FileJson className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-medium uppercase tracking-wider">原始数据</h2>
              </div>
              <p className="text-xs text-neutral-500">在此粘贴您的 JSON 或 CSV 数据。</p>
              <textarea
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                className="w-full h-48 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm font-mono text-neutral-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                placeholder="在此粘贴您的数据..."
                spellCheck={false}
              />
            </section>

            {/* Prompt Input */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-neutral-300">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-medium uppercase tracking-wider">可视化需求</h2>
              </div>
              <p className="text-xs text-neutral-500">描述您想要可视化的内容。</p>
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                className="w-full h-24 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-neutral-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                placeholder="例如：展示按月统计的销售额柱状图和用户占比饼图。"
              />
            </section>

            {/* Template Selection */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-neutral-300">
                <LayoutTemplate className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-medium uppercase tracking-wider">样式模板</h2>
              </div>
              <p className="text-xs text-neutral-500">选择一个内置的设计配方。</p>
              
              <div className="grid gap-3">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      selectedTemplate === template.id
                        ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/50'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${selectedTemplate === template.id ? 'text-indigo-300' : 'text-neutral-200'}`}>
                        {template.name}
                      </span>
                      {selectedTemplate === template.id && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>

          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 bg-neutral-950 relative flex flex-col">
          {error && (
            <div className="absolute top-4 left-4 right-4 z-20 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3 backdrop-blur-md">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-200 whitespace-pre-wrap">{error}</div>
            </div>
          )}

          {isGenerating ? (
            <div className="absolute inset-0 z-10 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Code className="w-4 h-4 text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <p className="text-sm font-medium text-indigo-300 animate-pulse">正在生成独立的 HTML 网页...</p>
              </div>
            </div>
          ) : !generatedHtml ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4 shadow-inner">
                <Maximize2 className="w-6 h-6 text-neutral-600" />
              </div>
              <p className="text-sm font-medium text-neutral-400">预览区域</p>
              <p className="text-xs mt-1 max-w-xs text-center leading-relaxed">
                点击“生成网页”按钮，根据您的数据和需求创建独立的 HTML 可视化网页。
              </p>
            </div>
          ) : null}

          {/* Iframe for rendering the generated HTML */}
          <iframe
            ref={iframeRef}
            className="w-full h-full border-none bg-white"
            title="Visualization Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

      </main>
    </div>
  );
}
