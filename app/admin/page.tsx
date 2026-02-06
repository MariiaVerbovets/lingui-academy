'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getIsAdmin } from '@/lib/isAdmin'
import { uploadWithIncrement } from '@/lib/uploadImage'
import { buildBookBase, buildWordBase } from '@/lib/filenames'
import { ImageUploader } from '../components/imageUploader'

type Language = 'DE' | 'PT'

type Book = {
  id: number
  name: string
  language: Language
  picture?: string | null
}

type Topic = {
  id: number
  name: string
  language: Language
}

type Mode = 'word' | 'book' | 'topic'

export default function AdminCreatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')

  const goBack = () => {
    if (from) {
      router.push(from)
      return
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/languages')
    }
  }

  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('word')

  const [books, setBooks] = useState<Book[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [topics, setTopics] = useState<Topic[]>([])
  const [topicForm, setTopicForm] = useState({
    language: 'DE' as Language,
    name: '',
  })

  const setTF = (k: string, v: string) => setTopicForm((p) => ({ ...p, [k]: v }))

  const [bookForm, setBookForm] = useState({
    language: 'DE' as Language,
    name: '',
    picture: '',
  })

  const [wordForm, setWordForm] = useState({
    language: 'DE' as Language,
    word_singular: '',
    word_plural: '',
    article_singular: '',
    article_plural: '',
    translation_ru: '',
    translation_ukr: '',
    translation_en: '',
    book_id: '',
    lesson: '1',
    topic_id: '',
    picture: '',
    tasks: '[]',
  })

  const [bookResetKey, setBookResetKey] = useState(0)
  const [wordResetKey, setWordResetKey] = useState(0)

  useEffect(() => {
    if (!ok) return

    const t = setTimeout(() => setOk(null), 5000)
    return () => clearTimeout(t)
  }, [ok])

  useEffect(() => {
    if (!error) return

    const t = setTimeout(() => setError(null), 10000)
    return () => clearTimeout(t)
  }, [error])

  const loadBooks = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('id,name,language,picture')
      .order('name', { ascending: true })

    if (error) throw error
    setBooks((data ?? []) as Book[])
  }

  const loadTopics = async () => {
    const { data, error } = await supabase
      .from('topics')
      .select('id,name,language')
      .order('name', { ascending: true })

    if (error) throw error
    setTopics((data ?? []) as Topic[])
  }

  const refetchAll = async () => {
    setError(null)
    try {
      await Promise.all([loadBooks(), loadTopics()])
    } catch (e: any) {
      setError(e.message ?? 'Unknown error')
    }
  }

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
        return
      }

      const isAdmin = await getIsAdmin()
      if (!isAdmin) {
        router.replace('/languages')
        return
      }

      await refetchAll()
      setLoading(false)
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Books filtered for the word dropdown
  const booksForSelectedLanguage = useMemo(() => {
    return books.filter((b) => b.language === wordForm.language)
  }, [books, wordForm.language])

  // Topics filtered for the word dropdown
  const topicsForSelectedLanguage = useMemo(() => {
    return topics.filter((t) => t.language === wordForm.language)
  }, [topics, wordForm.language])

  // Reset messages when switching mode
  useEffect(() => {
    setError(null)
    setOk(null)
  }, [mode])

  const setWF = (k: string, v: string) => setWordForm((p) => ({ ...p, [k]: v }))
  const setBF = (k: string, v: string) => setBookForm((p) => ({ ...p, [k]: v }))

  // ---------- Save book ----------
  const submitBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(null)

    if (!bookForm.name.trim()) {
      setError('Book name is required.')
      return
    }

    if (!bookForm.picture.trim()) {
      setError('Picture is required.')
      return
    }

    const payload = {
      language: bookForm.language,
      name: bookForm.name.trim(),
      picture: bookForm.picture.trim(),
    }

    const { error: insErr } = await supabase
      .from('books')
      .insert(payload)
      .select('id,name,language,picture')
      .single()

    if (insErr) {
      setError(insErr.message)
      return
    }

    setOk('Book added ✅')
    setBookForm((p) => ({ ...p, name: '', picture: '' }))
    setBookResetKey((k) => k + 1)
    await refetchAll()
  }

  // ---------- Save topic ----------
  const submitTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(null)

    if (!topicForm.name.trim()) {
      setError('Topic name is required.')
      return
    }

    const payload = {
      language: topicForm.language,
      name: topicForm.name.trim(),
    }

    const { error } = await supabase
      .from('topics')
      .insert(payload)
      .select('id,name,language')
      .single()

    if (error) {
      setError(error.message)
      return
    }

    setOk('Topic added ✅')
    setTopicForm((p) => ({ ...p, name: '' }))

    await refetchAll()
  }

  // ---------- Save word ----------
  const submitWord = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(null)

    if (!wordForm.book_id) {
      setError('Please select a book.')
      return
    }

    if (!wordForm.topic_id) {
      setError('Please select a topic.')
      return
    }

    if (!wordForm.picture.trim()) {
      setError('Picture is required.')
      return
    }

    let tasksJson: any
    try {
      tasksJson = JSON.parse(wordForm.tasks || '[]')
    } catch {
      setError('Tasks must be valid JSON (e.g. []).')
      return
    }

    const payload = {
      language: wordForm.language,
      word_singular: wordForm.word_singular.trim(),
      word_plural: wordForm.word_plural.trim() || null,
      article_singular: wordForm.article_singular.trim() || null,
      article_plural: wordForm.article_plural.trim() || null,
      translation_ru: wordForm.translation_ru.trim() || null,
      translation_ukr: wordForm.translation_ukr.trim() || null,
      translation_en: wordForm.translation_en.trim() || null,
      book_id: Number(wordForm.book_id),
      lesson: Number(wordForm.lesson),
      topic_id: Number(wordForm.topic_id),
      picture: wordForm.picture.trim(),
      tasks: tasksJson,
    }

    if (!payload.word_singular) {
      setError('Word (singular) is required.')
      return
    }

    const { error: insErr } = await supabase.from('words').insert(payload)
    if (insErr) {
      setError(insErr.message)
      return
    }

    setOk('Word added ✅')
    setWordForm((p) => ({
      ...p,
      word_singular: '',
      word_plural: '',
      article_singular: '',
      article_plural: '',
      translation_ru: '',
      translation_ukr: '',
      translation_en: '',
      picture: '',
      tasks: '[]',
    }))
    setWordResetKey((k) => k + 1)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
        <p className="pt-10 text-center text-white/60">Loading…</p>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
      {/* Back button */}
      <button
        type="button"
        onClick={goBack}
        className={[
          'absolute left-6 top-6 z-30',
          'inline-flex items-center gap-2',
          'text-sm text-white/70 hover:text-white',
          'transition',
        ].join(' ')}
      >
        <span className="text-base">←</span>
        Back
      </button>

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-24 -left-28 h-[380px] w-[380px] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 -right-24 h-[460px] w-[460px] rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_55%)]" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        <div className="flex flex-1 items-center justify-center py-10 sm:py-16">
          <div className="w-full max-w-3xl">
            <div className="min-h-[40vh] rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl py-10 px-6 sm:py-14 sm:px-10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
              {/* Header */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                    <span className="text-xl">🐧</span>
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Lingui Academy • Admin</p>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                      Create content
                    </h1>
                  </div>
                </div>
              </div>

              {/* Mode switch (radio) */}
              <div className="mt-6 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="book"
                    checked={mode === 'book'}
                    onChange={() => setMode('book')}
                    className="accent-white shrink-0"
                  />
                  Book
                </label>

                <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="word"
                    checked={mode === 'word'}
                    onChange={() => setMode('word')}
                    className="accent-white shrink-0"
                  />
                  Word
                </label>

                <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="topic"
                    checked={mode === 'topic'}
                    onChange={() => setMode('topic')}
                    className="accent-white shrink-0"
                  />
                  Topic
                </label>
              </div>

              {/* Messages */}
              {error && (
                <div className="mt-5 inline-flex rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </div>
              )}
              {ok && (
                <div className="mt-5 inline-flex rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  {ok}
                </div>
              )}

              {/* Forms */}
              <div className="mt-6">
                {mode === 'book' ? (
                  <form onSubmit={submitBook} className="grid gap-4">
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-x-12">
                      <div className="grid gap-2 sm:col-span-2">
                        <label className="text-sm text-white/80">Language</label>
                        <select
                          value={bookForm.language}
                          onChange={(e) => {
                            setBF('language', e.target.value)
                            setBF('picture', '')
                          }}
                          className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                        >
                          <option value="DE">DE</option>
                          <option value="PT">PT</option>
                        </select>
                      </div>

                      <div className="grid gap-2 sm:col-span-4">
                        <label className="text-sm text-white/80">Book name</label>
                        <input
                          value={bookForm.name}
                          onChange={(e) => setBF('name', e.target.value)}
                          className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-2 mt-6">
                        <label className="text-sm text-white/80">Picture</label>
                          <ImageUploader
                            value={bookForm.picture}
                            resetKey={bookResetKey}
                            onChange={(url) => setBF('picture', url)}
                            onError={(msg) => setError(msg)}
                            upload={async (file) => {
                              const baseName = buildBookBase(bookForm.name)
                              return await uploadWithIncrement(file, {
                                entity: 'books',
                                language: bookForm.language,
                                baseName,
                              })
                            }}
                            canUpload={() => {
                              if (!bookForm.name.trim()) return { ok: false, message: 'Enter book name first.' }
                              return { ok: true }
                            }}
                          />
                      </div>

                    <button
                      type="submit"
                      disabled={!bookForm.picture.trim()}
                      className="mt-10 w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0"
                    >
                      Save book
                    </button>
                  </form>
                ) : mode === 'word' ? (
                  <form onSubmit={submitWord} className="grid gap-10">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-x-5">
                    {/* Language */}
                    <div className="grid gap-2 sm:col-span-2">
                      <label className="text-sm text-white/80">Language</label>
                      <select
                        value={wordForm.language}
                        onChange={(e) => {
                          setWF('language', e.target.value)
                          setWF('book_id', '')
                          setWF('topic_id', '')
                          setWF('picture', '')
                        }}
                        className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                      >
                        <option value="DE">DE</option>
                        <option value="PT">PT</option>
                      </select>
                    </div>

                    {/* Book */}
                    <div className="grid gap-2 sm:col-span-4">
                      <label className="text-sm text-white/80">Book</label>
                      <select
                        value={wordForm.book_id}
                        onChange={(e) => setWF('book_id', e.target.value)}
                        className={[
                          "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none",
                          "focus:border-white/25 focus:ring-2 focus:ring-white/10",
                          wordForm.book_id ? "text-white" : "text-white/40",
                        ].join(" ")}
                        required
                      >
                        <option value="" disabled>— choose —</option>
                        {booksForSelectedLanguage.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Topic */}
                    <div className="grid gap-2 sm:col-span-4">
                      <label className="text-sm text-white/80">Topic</label>
                      <select
                        value={wordForm.topic_id}
                        onChange={(e) => setWF('topic_id', e.target.value)}
                        className={[
                          "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 outline-none",
                          "focus:border-white/25 focus:ring-2 focus:ring-white/10",
                          wordForm.topic_id ? "text-white" : "text-white/40",
                        ].join(" ")}
                        required
                      >
                        <option value="" disabled>— choose —</option>
                        {topicsForSelectedLanguage.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lesson */}
                    <div className="grid gap-2 sm:col-span-2">
                      <label className="text-sm text-white/80">Lesson</label>
                      <input
                        value={wordForm.lesson}
                        onChange={(e) => setWF('lesson', e.target.value)}
                        type="number"
                        min={1}
                        className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-start">
                    <div className="sm:col-span-12">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-x-4">
                        <div className="sm:col-span-6">
                          <p className="text-white font-semibold text-base leading-none">Word</p>
                        </div>
                        <div className="sm:col-span-6">
                          <p className="text-white font-semibold text-base leading-none">Article</p>
                        </div>

                        <div className="sm:col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-x-4">
                          <div className="grid gap-2 sm:col-span-3">
                            <label className="text-sm text-white/60">Singular</label>
                            <input
                              value={wordForm.word_singular}
                              onChange={(e) => setWF('word_singular', e.target.value)}
                              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                              required
                            />
                          </div>

                          <div className="grid gap-2 sm:col-span-3">
                            <label className="text-sm text-white/60">Plural</label>
                            <input
                              value={wordForm.word_plural}
                              onChange={(e) => setWF('word_plural', e.target.value)}
                              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                            />
                          </div>

                          <div className="grid gap-2 sm:col-span-3">
                            <label className="text-sm text-white/60">Singular</label>
                            <input
                              value={wordForm.article_singular}
                              onChange={(e) => setWF('article_singular', e.target.value)}
                              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                            />
                          </div>

                          <div className="grid gap-2 sm:col-span-3">
                            <label className="text-sm text-white/60">Plural</label>
                            <input
                              value={wordForm.article_plural}
                              onChange={(e) => setWF('article_plural', e.target.value)}
                              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Translations grouped row */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-start">
                    <div className="sm:col-span-12">
                      <p className="text-white font-semibold text-base leading-none">Translations</p>

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-x-4">
                        <div className="grid gap-2 sm:col-span-4">
                          <label className="text-sm text-white/60">Russian</label>
                          <input
                            value={wordForm.translation_ru}
                            onChange={(e) => setWF('translation_ru', e.target.value)}
                            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                          />
                        </div>

                        <div className="grid gap-2 sm:col-span-4">
                          <label className="text-sm text-white/60">Ukrainian</label>
                          <input
                            value={wordForm.translation_ukr}
                            onChange={(e) => setWF('translation_ukr', e.target.value)}
                            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                          />
                        </div>

                        <div className="grid gap-2 sm:col-span-4">
                          <label className="text-sm text-white/60">English</label>
                          <input
                            value={wordForm.translation_en}
                            onChange={(e) => setWF('translation_en', e.target.value)}
                            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                      <div className="grid gap-2 sm:col-span-2">
                        <label className="text-sm text-white/80">Picture</label>
                        <ImageUploader
                          value={wordForm.picture}
                          resetKey={wordResetKey}
                          onChange={(url) => setWF('picture', url)}
                          onError={(msg) => setError(msg)}
                          upload={async (file) => {
                            const topicName =
                              topics.find((t) => String(t.id) === String(wordForm.topic_id))?.name ?? '-'

                            const baseName = buildWordBase({
                              lesson: wordForm.lesson,
                              topicName,
                              wordSingular: wordForm.word_singular,
                            })

                            return await uploadWithIncrement(file, {
                              entity: 'words',
                              language: wordForm.language,
                              baseName,
                            })
                          }}
                          canUpload={() => {
                            const lessonNum = Number(wordForm.lesson)
                            if (!Number.isFinite(lessonNum) || lessonNum < 1) {
                              return { ok: false, message: 'Enter correct lesson number.' }
                            }
                            if (!wordForm.topic_id.trim()) {
                              return { ok: false, message: 'Select a topic first.' }
                            }
                            if (!wordForm.word_singular.trim()) {
                              return { ok: false, message: 'Enter word (singular) first.' }
                            }
                            return { ok: true }
                          }}
                        />
                      </div>

                      <div className="grid gap-2 sm:col-span-4">
                        <label className="text-sm text-white/80">Tasks (optional)</label>

                        <textarea
                          value={wordForm.tasks}
                          onChange={(e) => setWF('tasks', e.target.value)}
                          className={[
                            "h-65 w-full resize-none",
                            "rounded-2xl border border-white/15 bg-white/10 px-4 py-3",
                            "text-white outline-none",
                            "focus:border-white/25 focus:ring-2 focus:ring-white/10",
                            "font-mono text-sm leading-5",
                          ].join(" ")}
                          placeholder="[]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!wordForm.picture.trim()}
                      className="mt-10 w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0"
                    >
                      Save word
                    </button>
                  </form>
                ) : (
                  <form onSubmit={submitTopic} className="grid gap-4">
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-x-12">
                      <div className="grid gap-2 sm:col-span-2">
                        <label className="text-sm text-white/80">Language</label>
                        <select
                          value={topicForm.language}
                          onChange={(e) => setTF('language', e.target.value)}
                          className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                          required
                        >
                          <option value="DE">DE</option>
                          <option value="PT">PT</option>
                        </select>
                      </div>

                      <div className="grid gap-2 sm:col-span-5">
                        <label className="text-sm text-white/80">Topic name</label>
                        <input
                          value={topicForm.name}
                          onChange={(e) => setTF('name', e.target.value)}
                          className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="mt-10 w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0"
                    >
                      Save topic
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="pb-6">
          <p className="text-center text-xs text-white/35">Lingui Academy</p>
        </footer>
      </div>
    </main>
  )
}