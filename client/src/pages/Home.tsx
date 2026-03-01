import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTelegraph } from '@/hooks/useTelegraph';
import { Loader2, Copy, ExternalLink } from 'lucide-react';

export default function Home() {
  const telegraph = useTelegraph();
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [history, setHistory] = useState<Array<{ title: string; url: string; date: string }>>([]);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('telegraph_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Chyba při načítání historie:', e);
      }
    }
  }, []);

  // Show account dialog if not initialized
  useEffect(() => {
    if (telegraph.isInitialized && !telegraph.account && !showAccountDialog) {
      setShowAccountDialog(true);
    }
  }, [telegraph.isInitialized, telegraph.account, showAccountDialog]);

  const handleInitializeAccount = async () => {
    if (!accountName.trim()) {
      toast.error('Zadejte prosím jméno účtu');
      return;
    }

    try {
      await telegraph.initializeAccount(accountName, authorName || 'Anonym');
      setShowAccountDialog(false);
      toast.success('Telegraph účet vytvořen!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chyba při vytváření účtu');
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error('Zadejte prosím nadpis');
      return;
    }

    if (!content.trim()) {
      toast.error('Zadejte prosím obsah');
      return;
    }

    if (!telegraph.account) {
      toast.error('Žádný Telegraph účet. Prosím vytvořte nejdřív účet.');
      setShowAccountDialog(true);
      return;
    }

    setIsPublishing(true);

    try {
      const result = await telegraph.publishArticle(title, content, authorName || telegraph.account.author_name);

      if (result) {
        const url = result.url;
        setPublishedUrl(url);

        // Add to history
        const newEntry = {
          title,
          url,
          date: new Date().toLocaleString('cs-CZ'),
        };
        const updatedHistory = [newEntry, ...history];
        setHistory(updatedHistory);
        localStorage.setItem('telegraph_history', JSON.stringify(updatedHistory));

        // Clear form
        setTitle('');
        setContent('');

        toast.success('Článek úspěšně publikován!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chyba při publikování');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClear = () => {
    setTitle('');
    setAuthorName('');
    setContent('');
    setPublishedUrl(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Odkaz zkopírován!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-yellow-400/20 bg-black/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-yellow-300 font-mono tracking-wider">
                TELEKRIPTON
              </h1>
              <p className="text-sm text-yellow-200/60 mt-1">
                Minimalistický editor ve stylu Telegra.ph + tmavé Vesper téma
              </p>
            </div>
            {telegraph.account && (
              <div className="text-right text-sm">
                <p className="text-yellow-200/80">
                  Účet: <span className="font-mono text-yellow-300">{telegraph.account.short_name}</span>
                </p>
                <button
                  onClick={() => telegraph.logout()}
                  className="text-yellow-200/60 hover:text-yellow-300 text-xs mt-2 underline"
                >
                  Odhlásit se
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Editor Panel */}
          <div className="col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-yellow-400/20">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 border-b-2 font-mono text-sm transition ${
                  activeTab === 'editor'
                    ? 'border-yellow-400 text-yellow-300'
                    : 'border-transparent text-yellow-200/60 hover:text-yellow-300'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 border-b-2 font-mono text-sm transition ${
                  activeTab === 'history'
                    ? 'border-yellow-400 text-yellow-300'
                    : 'border-transparent text-yellow-200/60 hover:text-yellow-300'
                }`}
              >
                Historie ({history.length})
              </button>
            </div>

            {/* Editor Tab */}
            {activeTab === 'editor' && (
              <div className="space-y-6">
                {/* Title Input */}
                <div>
                  <label className="block text-xs font-mono text-yellow-200/60 mb-2 uppercase">
                    Nadpis Články
                  </label>
                  <Input
                    placeholder="Zadejte nadpis..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-slate-800 border-yellow-400/20 text-yellow-200 placeholder:text-yellow-200/30 font-mono"
                  />
                </div>

                {/* Author Input */}
                <div>
                  <label className="block text-xs font-mono text-yellow-200/60 mb-2 uppercase">
                    Autor (volitelně)
                  </label>
                  <Input
                    placeholder="Vaše jméno..."
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="bg-slate-800 border-yellow-400/20 text-yellow-200 placeholder:text-yellow-200/30 font-mono"
                  />
                </div>

                {/* Formatting Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button className="px-3 py-2 bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition font-mono text-sm">
                    B
                  </button>
                  <button className="px-3 py-2 bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition font-mono text-sm italic">
                    I
                  </button>
                  <button className="px-3 py-2 bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition font-mono text-sm">
                    &lt;&gt;
                  </button>
                  <button className="px-3 py-2 bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition font-mono text-sm">
                    🔗
                  </button>
                  <button className="px-3 py-2 bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition font-mono text-sm">
                    H
                  </button>
                </div>

                {/* Content Textarea */}
                <div>
                  <label className="block text-xs font-mono text-yellow-200/60 mb-2 uppercase">
                    Obsah (Markdown)
                  </label>
                  <Textarea
                    placeholder="Napište svůj článek zde... Podporujeme **bold**, *italic*, `code`, [links](url) a # nadpisy"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="bg-slate-800 border-yellow-400/20 text-yellow-200 placeholder:text-yellow-200/30 font-mono min-h-96 resize-none"
                  />
                </div>

                {/* Published URL Display */}
                {publishedUrl && (
                  <div className="bg-cyan-400/10 border border-cyan-400/30 p-4 rounded">
                    <p className="text-xs font-mono text-cyan-300 mb-2">Publikováno:</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-cyan-300 hover:text-cyan-200 break-all font-mono text-sm underline"
                      >
                        {publishedUrl}
                      </a>
                      <button
                        onClick={() => copyToClipboard(publishedUrl)}
                        className="p-2 hover:bg-cyan-400/20 rounded transition"
                        title="Zkopírovat odkaz"
                      >
                        <Copy size={16} className="text-cyan-300" />
                      </button>
                      <a
                        href={publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-cyan-400/20 rounded transition"
                        title="Otevřít v novém okně"
                      >
                        <ExternalLink size={16} className="text-cyan-300" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing || telegraph.loading}
                    className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-6 font-mono text-lg"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Publikování...
                      </>
                    ) : (
                      <>
                        ➤ Publikovat
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleClear}
                    variant="outline"
                    className="flex-1 border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/10 py-6 font-mono text-lg"
                  >
                    ✕ Vymazat
                  </Button>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-yellow-200/40 text-sm">Zatím žádné publikované články...</p>
                ) : (
                  history.map((entry, idx) => (
                    <div key={idx} className="bg-slate-800/50 border border-yellow-400/20 p-3 rounded">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-yellow-300 font-mono text-sm font-bold truncate">
                            {entry.title}
                          </p>
                          <p className="text-yellow-200/60 font-mono text-xs mt-1">{entry.date}</p>
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-300 hover:text-cyan-200 font-mono text-xs underline break-all mt-2 inline-block"
                          >
                            {entry.url}
                          </a>
                        </div>
                        <button
                          onClick={() => copyToClipboard(entry.url)}
                          className="p-2 hover:bg-yellow-400/20 rounded transition flex-shrink-0"
                          title="Zkopírovat odkaz"
                        >
                          <Copy size={16} className="text-yellow-300" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Preview/Info Panel */}
          <div className="col-span-1">
            <div className="bg-slate-800/50 border border-yellow-400/20 rounded p-4">
              <h2 className="text-sm font-mono text-yellow-300 uppercase mb-4">Náhled</h2>

              {publishedUrl ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-yellow-200/60 mb-1">Nadpis:</p>
                    <p className="text-yellow-200 font-mono text-sm">{title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-yellow-200/60 mb-1">Autor:</p>
                    <p className="text-yellow-200 font-mono text-sm">{authorName || telegraph.account?.author_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-yellow-200/60 mb-1">Náhled obsahu:</p>
                    <p className="text-yellow-200 font-mono text-xs line-clamp-4">{content}</p>
                  </div>
                </div>
              ) : (
                <div className="text-yellow-200/40 text-xs space-y-2">
                  <p>Účet: <span className="text-yellow-300">{telegraph.account?.short_name || 'Nevytvořen'}</span></p>
                  <p>Články se publikují na Telegraph</p>
                  <p>Odkaz se zkopíruje automaticky</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Dialog */}
      {showAccountDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-yellow-400/20 rounded p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-yellow-300 font-mono mb-2">Vytvořit Telegraph Účet</h2>
            <p className="text-yellow-200/60 text-sm mb-4">Zadejte jméno pro váš Telegraph účet</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-yellow-200/60 mb-2 uppercase">Jméno Účtu</label>
                <Input
                  placeholder="Např. moj-blog"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="bg-slate-700 border-yellow-400/20 text-yellow-200 placeholder:text-yellow-200/30 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleInitializeAccount}
                  disabled={telegraph.loading}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold font-mono"
                >
                  {telegraph.loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Vytváření...
                    </>
                  ) : (
                    'Vytvořit'
                  )}
                </Button>
                <Button
                  onClick={() => setShowAccountDialog(false)}
                  variant="outline"
                  className="flex-1 border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/10 font-mono"
                >
                  Zrušit
                </Button>
              </div>

              {telegraph.error && (
                <p className="text-red-400 text-xs font-mono">{telegraph.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-yellow-400/20 bg-black/40 backdrop-blur-sm mt-12">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs text-yellow-200/40 font-mono">
          Made with Manus
        </div>
      </div>
    </div>
  );
}
