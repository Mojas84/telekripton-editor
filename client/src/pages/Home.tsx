import { useState, useEffect } from 'react';
import { telegraphContentToMarkdown } from '@/lib/telegraph';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTelegraph } from '@/hooks/useTelegraph';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { Loader2, Copy, ExternalLink, Edit2, X, Trash2 } from 'lucide-react';

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
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isDeletingPath, setIsDeletingPath] = useState<string | null>(null);
  const [deleteConfirmPath, setDeleteConfirmPath] = useState<string | null>(null);

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

        // KEEP form data - don't clear it
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chyba při publikování');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEdit = (entry: HistoryEntry) => {
    setTitle(entry.title);
    setContent(''); // Clear first, will be loaded from API
    setEditingPath(entry.path);
    setActiveTab('editor');
    setPublishedUrl(entry.url);
    toast.info('Načítám článek pro editaci...');
    fetchArticleContent(entry.path);
  };

  const fetchArticleContent = async (path: string) => {
    setIsLoadingContent(true);
    try {
      const page = await telegraph.getPage(path, true);
      console.log('Loaded page:', page);
      if (page && page.content) {
        // Convert Telegraph content nodes back to markdown
        const markdownContent = telegraphContentToMarkdown(page.content);
        console.log('Converted markdown:', markdownContent);
        setContent(markdownContent);
        toast.success('Článek načten pro editaci!');
      } else {
        toast.error('Nepodařilo se načíst obsah článku.');
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error(error instanceof Error ? error.message : 'Chyba při načítání obsahu článku.');
    } finally {
      setIsLoadingContent(false);
    }
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
    toast.success('Odkaz zkopirovan!');
  };

  const handleDeleteArticle = async (path: string) => {
    setIsDeletingPath(path);
    try {
      await telegraph.deleteArticle(path);
      const updatedHistory = history.filter(entry => entry.path !== path);
      setHistory(updatedHistory);
      localStorage.setItem('telegraph_history', JSON.stringify(updatedHistory));
      toast.success('Clanek byl smazan!');
      setDeleteConfirmPath(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chyba pri mazani clanku');
    } finally {
      setIsDeletingPath(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#FFFFFF] relative overflow-hidden">
      {/* Header */}
      <div className="glass-header shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4">
                <img src="/krtecek_mascot_v3.png" alt="Mascot" className="w-12 h-12 object-contain" />
                <h1 className="text-4xl font-bold text-[#99FFE4] font-mono tracking-wider">
                  Vespergraph
                </h1>
              </div>
              <p className="text-sm text-[#A0A0A0] mt-1">
                Profesionální editor s integrovaným Vesper tématem
              </p>
            </div>
            {telegraph.account && (
              <div className="text-right text-sm">
                <p className="text-[#A0A0A0]">
                  Účet: <span className="font-mono text-[#FFC799]">{telegraph.account.short_name}</span>
                </p>
                <button
                  onClick={() => telegraph.logout()}
                  className="text-[#A0A0A0] hover:text-[#FFC799] text-xs mt-2 underline"
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
          <div className="col-span-2 space-y-6 glass-panel p-6 rounded-2xl">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-[#FFFFFF]/10">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 border-b-2 font-mono text-sm transition ${
                  activeTab === 'editor'
                    ? 'border-[#FFC799] text-[#FFC799]'
                    : 'border-transparent text-[#A0A0A0] hover:text-[#FFC799]'
                }`}
              >
                Editor {editingPath && '(Editace)'}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 border-b-2 font-mono text-sm transition ${
                  activeTab === 'history'
                    ? 'border-[#FFC799] text-[#FFC799]'
                    : 'border-transparent text-[#A0A0A0] hover:text-[#FFC799]'
                }`}
              >
                Historie ({history.length})
              </button>
            </div>

            {/* Editor Tab */}
            {activeTab === 'editor' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Title Input */}
                <div>
                  <label className="block text-xs font-mono text-[#A0A0A0] mb-2 uppercase">
                    Nadpis Články
                  </label>
                  <Input
                    placeholder="Zadejte nadpis..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-[#101010] border-[#FFFFFF]/10 shadow-sm transition-all focus:border-[#FFC799]/50 focus:ring-1 focus:ring-[#FFC799]/20 text-[#FFFFFF] placeholder:text-[#7E7E7E] font-mono"
                  />
                </div>

                {/* Author Input */}
                <div>
                  <label className="block text-xs font-mono text-[#A0A0A0] mb-2 uppercase">
                    Autor (volitelně)
                  </label>
                  <Input
                    placeholder="Vaše jméno..."
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="bg-[#101010] border-[#FFFFFF]/10 shadow-sm transition-all focus:border-[#FFC799]/50 focus:ring-1 focus:ring-[#FFC799]/20 text-[#FFFFFF] placeholder:text-[#7E7E7E] font-mono"
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
                  <label className="block text-xs font-mono text-[#A0A0A0] mb-2 uppercase">
                    Obsah (Markdown)
                  </label>
                  <Textarea
                    placeholder="Napište svůj článek zde... Podporujeme **bold**, *italic*, `code`, [links](url) a # nadpisy"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isLoadingContent}
                    className="bg-[#101010] border-[#FFFFFF]/10 shadow-sm transition-all focus:border-[#FFC799]/50 focus:ring-1 focus:ring-[#FFC799]/20 text-[#FFFFFF] placeholder:text-[#7E7E7E] font-mono min-h-96 resize-none disabled:opacity-50"
                  />
                  {isLoadingContent && (
                    <div className="flex items-center gap-2 mt-2 text-[#A0A0A0]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Načítám obsah...</span>
                    </div>
                  )}
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
                        title="Zkopírovat"
                      >
                        <Copy className="w-4 h-4 text-[#FE7300]" />
                      </button>
                      <a
                        href={publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-[#FE7300]/20 rounded transition"
                        title="Otevřít"
                      >
                        <ExternalLink className="w-4 h-4 text-[#FE7300]" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing || isLoadingContent}
                    className="flex-1 bg-[#FFC799] hover:bg-[#FFCCAA] text-black font-bold font-mono"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingPath ? 'Aktualizuji...' : 'Publikuji...'}
                      </>
                    ) : (
                      <>
                        <span>▶ {editingPath ? 'Aktualizovat' : 'Publikovat'}</span>
                      </>
                    )}
                  </Button>
                  {editingPath && (
                    <Button
                      onClick={handleCancelEdit}
                      disabled={isPublishing}
                      className="bg-[#101010] hover:bg-[#2C2C2C] text-[#FFC799] border border-[#FFC799]/30 font-mono"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Zrušit editaci
                    </Button>
                  )}
                  <Button
                    onClick={handleClear}
                    disabled={isPublishing}
                    className="bg-[#101010] hover:bg-[#2C2C2C] text-[#FFC799] border border-[#FFC799]/30 font-mono"
                  >
                    Vymazat
                  </Button>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-[#A0A0A0] text-sm">Zatím žádné články v historii</p>
                ) : (
                  history.map((entry, idx) => (
                    <div
                      key={idx}
                      className="bg-[#101010] border border-[#FFFFFF]/10 p-4 rounded hover:border-[#FFC799]/40 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-mono text-[#FFC799] font-bold truncate">{entry.title}</h3>
                          <p className="text-xs text-[#A0A0A0] mt-1">{entry.date}</p>
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#FE7300] hover:text-[#FFCCAA] break-all underline mt-2 inline-block"
                          >
                            {entry.url}
                          </a>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(entry)}
                            disabled={isLoadingContent}
                            className="p-2 bg-[#FFC799] hover:bg-[#FFCCAA] text-black rounded transition disabled:opacity-50"
                            title="Editovat"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => copyToClipboard(entry.url)}
                            className="p-2 bg-[#101010] hover:bg-[#2C2C2C] border border-[#FFC799]/30 text-[#FFC799] rounded transition"
                            title="Zkopírovat"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-[#101010] hover:bg-[#2C2C2C] border border-[#FFC799]/30 text-[#FFC799] rounded transition"
                            title="Otevřít"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setDeleteConfirmPath(entry.path)}
                            disabled={isDeletingPath === entry.path}
                            className="p-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-500 rounded transition disabled:opacity-50"
                            title="Smazat"
                          >
                            {isDeletingPath === entry.path ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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
            <div className="sticky top-8 bg-[#101010] border border-[#FFFFFF]/10 rounded p-6">
              <h2 className="text-sm font-mono text-[#A0A0A0] uppercase mb-4">Live Preview</h2>
              <div className="prose prose-invert max-w-none text-[#A0A0A0] text-sm">
                {content ? (
                  <MarkdownPreview content={content} />
                ) : (
                  <p className="text-[#FFC799]/40 italic">Obsah se bude zobrazovat zde...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmPath && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101010] border border-red-500/30 rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-xl font-mono text-red-500 mb-4">Potvrdit smazani</h2>
            <p className="text-[#A0A0A0] mb-6">Opravdu chcete smazat tento clanek? Bude odstranen z Telegraphu a z vasi historie.</p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleDeleteArticle(deleteConfirmPath)}
                disabled={isDeletingPath !== null}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold font-mono"
              >
                {isDeletingPath ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mazani...
                  </>
                ) : (
                  <>Smazat</>
                )}
              </Button>
              <Button
                onClick={() => setDeleteConfirmPath(null)}
                disabled={isDeletingPath !== null}
                className="flex-1 bg-[#101010] hover:bg-[#2C2C2C] text-[#FFC799] border border-[#FFC799]/30 font-mono"
              >
                Zrusit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Account Dialog */}
      {showAccountDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#101010] border border-[#FFFFFF]/10 rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-xl font-mono text-[#FFC799] mb-4">Vytvořit Telegraph účet</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#A0A0A0] mb-2 uppercase">
                  Krátké jméno účtu
                </label>
                <Input
                  placeholder="např. mujucet"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="bg-[#101010] border-[#FFFFFF]/10 text-[#FFC799]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#A0A0A0] mb-2 uppercase">
                  Jméno autora (volitelně)
                </label>
                <Input
                  placeholder="Vaše jméno"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="bg-[#101010] border-[#FFFFFF]/10 text-[#FFC799]"
                />
              </div>
              <Button
                onClick={handleInitializeAccount}
                className="w-full bg-[#FFC799] hover:bg-[#FFCCAA] text-black font-bold font-mono"
              >
                Vytvořit účet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
