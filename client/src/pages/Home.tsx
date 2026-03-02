import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTelegraph } from '@/hooks/useTelegraph';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { Loader2, Copy, ExternalLink, Edit2, X } from 'lucide-react';

interface HistoryEntry {
  title: string;
  url: string;
  path: string;
  date: string;
}

export default function Home() {
  const telegraph = useTelegraph();
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [editingPath, setEditingPath] = useState<string | null>(null);

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
      let result;
      if (editingPath) {
        result = await telegraph.editArticle(editingPath, title, content, authorName || telegraph.account.author_name);
        toast.success('Článek úspěšně aktualizován!');
        setEditingPath(null);
      } else {
        result = await telegraph.publishArticle(title, content, authorName || telegraph.account.author_name);
        toast.success('Článek úspěšně publikován!');
      }

      if (result) {
        const url = result.url;
        const path = result.path;
        setPublishedUrl(url);

        // Add to history if new
        if (!editingPath) {
          const newEntry: HistoryEntry = {
            title,
            url,
            path,
            date: new Date().toLocaleString('cs-CZ'),
          };
          const updatedHistory = [newEntry, ...history];
          setHistory(updatedHistory);
          localStorage.setItem('telegraph_history', JSON.stringify(updatedHistory));
        }

        // Clear form
        setTitle('');
        setContent('');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chyba při publikování');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEdit = (entry: HistoryEntry) => {
    setTitle(entry.title);
    setContent('');
    setEditingPath(entry.path);
    setActiveTab('editor');
    setPublishedUrl(entry.url);
    toast.info('Načítám článek pro editaci...');
  };

  const handleCancelEdit = () => {
    setTitle('');
    setContent('');
    setEditingPath(null);
    setPublishedUrl(null);
  };

  const handleClear = () => {
    setTitle('');
    setAuthorName('');
    setContent('');
    setPublishedUrl(null);
    setEditingPath(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Odkaz zkopírován!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#101010] via-[#1C1C1C] to-[#101010]">
      {/* Header */}
      <div className="border-b border-[#FFC799]/20 bg-black/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#FFC799] font-mono tracking-wider">
                VESPERGRAPH
              </h1>
              <p className="text-sm text-[#FFC799]/60 mt-1">
                Telegraph editor s Vesper témou + live preview
              </p>
            </div>
            {telegraph.account && (
              <div className="text-right text-sm">
                <p className="text-[#FFC799]/80">
                  Účet: <span className="font-mono text-[#FFC799]">{telegraph.account.short_name}</span>
                </p>
                <button
                  onClick={() => telegraph.logout()}
                  className="text-[#FFC799]/60 hover:text-[#FFC799] text-xs mt-2 underline"
                >
                  Odhlásit se
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Editor Panel */}
          <div className="col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-[#FFC799]/20">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 border-b-2 font-mono text-sm transition ${
                  activeTab === 'editor'
                    ? 'border-[#FFC799] text-[#FFC799]'
                    : 'border-transparent text-[#FFC799]/60 hover:text-[#FFC799]'
                }`}
              >
                Editor {editingPath && '(Editace)'}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 border-b-2 font-mono text-sm transition ${
                  activeTab === 'history'
                    ? 'border-[#FFC799] text-[#FFC799]'
                    : 'border-transparent text-[#FFC799]/60 hover:text-[#FFC799]'
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
                  <label className="block text-xs font-mono text-[#FFC799]/60 mb-2 uppercase">
                    Nadpis Články
                  </label>
                  <Input
                    placeholder="Zadejte nadpis..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-[#1C1C1C] border-[#FFC799]/20 text-[#FFC799] placeholder:text-[#FFC799]/30 font-mono"
                  />
                </div>

                {/* Author Input */}
                <div>
                  <label className="block text-xs font-mono text-[#FFC799]/60 mb-2 uppercase">
                    Autor (volitelně)
                  </label>
                  <Input
                    placeholder="Vaše jméno..."
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="bg-[#1C1C1C] border-[#FFC799]/20 text-[#FFC799] placeholder:text-[#FFC799]/30 font-mono"
                  />
                </div>

                {/* Formatting Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button className="px-3 py-2 bg-[#FFC799] text-black font-bold hover:bg-[#FFCCAA] transition font-mono text-sm">
                    B
                  </button>
                  <button className="px-3 py-2 bg-[#FFC799] text-black font-bold hover:bg-[#FFCCAA] transition font-mono text-sm italic">
                    I
                  </button>
                  <button className="px-3 py-2 bg-[#FFC799] text-black font-bold hover:bg-[#FFCCAA] transition font-mono text-sm">
                    &lt;&gt;
                  </button>
                  <button className="px-3 py-2 bg-[#FFC799] text-black font-bold hover:bg-[#FFCCAA] transition font-mono text-sm">
                    🔗
                  </button>
                  <button className="px-3 py-2 bg-[#FFC799] text-black font-bold hover:bg-[#FFCCAA] transition font-mono text-sm">
                    H
                  </button>
                </div>

                {/* Content Textarea */}
                <div>
                  <label className="block text-xs font-mono text-[#FFC799]/60 mb-2 uppercase">
                    Obsah (Markdown)
                  </label>
                  <Textarea
                    placeholder="Napište svůj článek zde... Podporujeme **bold**, *italic*, `code`, [links](url) a # nadpisy"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="bg-[#1C1C1C] border-[#FFC799]/20 text-[#FFC799] placeholder:text-[#FFC799]/30 font-mono min-h-96 resize-none"
                  />
                </div>

                {/* Published URL Display */}
                {publishedUrl && (
                  <div className="bg-[#FE7300]/10 border border-[#FE7300]/30 p-4 rounded">
                    <p className="text-xs font-mono text-[#FE7300] mb-2">
                      {editingPath ? 'Aktualizováno:' : 'Publikováno:'}
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-[#FE7300] hover:text-[#FFCCAA] break-all font-mono text-sm underline"
                      >
                        {publishedUrl}
                      </a>
                      <button
                        onClick={() => copyToClipboard(publishedUrl)}
                        className="p-2 hover:bg-[#FE7300]/20 rounded transition"
                        title="Zkopírovat odkaz"
                      >
                        <Copy size={16} className="text-[#FE7300]" />
                      </button>
                      <a
                        href={publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-[#FE7300]/20 rounded transition"
                        title="Otevřít v novém okně"
                      >
                        <ExternalLink size={16} className="text-[#FE7300]" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing || telegraph.loading}
                    className="flex-1 bg-[#FFC799] hover:bg-[#FFCCAA] text-black font-bold py-6 font-mono text-lg"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        {editingPath ? 'Aktualizování...' : 'Publikování...'}
                      </>
                    ) : (
                      <>
                        ➤ {editingPath ? 'Aktualizovat' : 'Publikovat'}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={editingPath ? handleCancelEdit : handleClear}
                    variant="outline"
                    className="flex-1 border-[#FFC799]/30 text-[#FFC799] hover:bg-[#FFC799]/10 py-6 font-mono text-lg"
                  >
                    {editingPath ? '✕ Zrušit' : '✕ Vymazat'}
                  </Button>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-[#FFC799]/40 text-sm">Zatím žádné publikované články...</p>
                ) : (
                  history.map((entry, idx) => (
                    <div key={idx} className="bg-[#1C1C1C]/50 border border-[#FFC799]/20 p-3 rounded">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[#FFC799] font-mono text-sm font-bold truncate">
                            {entry.title}
                          </p>
                          <p className="text-[#FFC799]/60 font-mono text-xs mt-1">{entry.date}</p>
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FE7300] hover:text-[#FFCCAA] font-mono text-xs underline break-all mt-2 inline-block"
                          >
                            {entry.url}
                          </a>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="p-2 hover:bg-[#FFC799]/20 rounded transition"
                            title="Editovat"
                          >
                            <Edit2 size={16} className="text-[#FFC799]" />
                          </button>
                          <button
                            onClick={() => copyToClipboard(entry.url)}
                            className="p-2 hover:bg-[#FFC799]/20 rounded transition"
                            title="Zkopírovat odkaz"
                          >
                            <Copy size={16} className="text-[#FFC799]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="col-span-1">
            <div className="bg-[#1C1C1C]/50 border border-[#FFC799]/20 rounded p-4 sticky top-8 max-h-[calc(100vh-120px)] overflow-y-auto">
              <h2 className="text-sm font-mono text-[#FFC799] uppercase mb-4">Live Preview</h2>

              {content.trim() ? (
                <div className="prose prose-invert max-w-none text-[#FFC799] prose-headings:text-[#FFC799] prose-strong:text-[#FFC799] prose-em:text-[#FFC799] prose-code:text-[#FE7300] prose-a:text-[#FE7300] prose-a:hover:text-[#FFCCAA]">
                  <MarkdownPreview content={content} />
                </div>
              ) : (
                <div className="text-[#FFC799]/40 text-xs space-y-2">
                  <p>Obsah se bude zobrazovat zde...</p>
                  <hr className="border-[#FFC799]/20 my-3" />
                  <p className="font-mono text-[#FFC799]/60">Nadpis: {title || '(prázdný)'}</p>
                  <p className="font-mono text-[#FFC799]/60">Autor: {authorName || telegraph.account?.author_name || '(prázdný)'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Dialog */}
      {showAccountDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1C1C1C] border border-[#FFC799]/20 rounded p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-[#FFC799] font-mono mb-2">Vytvořit Telegraph Účet</h2>
            <p className="text-[#FFC799]/60 text-sm mb-4">Zadejte jméno pro váš Telegraph účet</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#FFC799]/60 mb-2 uppercase">Jméno Účtu</label>
                <Input
                  placeholder="Např. moj-blog"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="bg-[#101010] border-[#FFC799]/20 text-[#FFC799] placeholder:text-[#FFC799]/30 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleInitializeAccount}
                  disabled={telegraph.loading}
                  className="flex-1 bg-[#FFC799] hover:bg-[#FFCCAA] text-black font-bold font-mono"
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
                  className="flex-1 border-[#FFC799]/30 text-[#FFC799] hover:bg-[#FFC799]/10 font-mono"
                >
                  Zrušit
                </Button>
              </div>

              {telegraph.error && (
                <p className="text-[#FE8080] text-xs font-mono">{telegraph.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#FFC799]/20 bg-black/40 backdrop-blur-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-[#FFC799]/40 font-mono">
          Made with Manus
        </div>
      </div>
    </div>
  );
}
