'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { uploadWithIncrement } from '@/lib/uploadImage'
import { buildBookBase, buildWordBase } from '@/lib/filenames'
import { ImageUploader } from '../components/imageUploader'
import { removeFromImagesBucketByPublicUrl } from '@/lib/removePictureByPublicUrl'
import Select from '../components/Select'

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

type ArticleConfig = {
  singular: string[]
  plural: string[]
}

const ARTICLES_BY_LANGUAGE: Record<Language, ArticleConfig> = {
  DE: {
    singular: ['der', 'die', 'das'],
    plural: ['die'],
  },
  PT: {
    singular: ['o', 'a'],
    plural: ['os', 'as'],
  },
}

const MODE_ITEMS = [
  { key: 'book' as const, label: '📚 Book' },
  { key: 'word' as const, label: '📝 Word' },
  { key: 'topic' as const, label: '🎨 Topic' },
]

type BookForm = {
  language: Language
  name: string
  picture: string
}

type TopicForm = {
  language: Language
  name: string
}

type WordForm = {
  language: Language
  word_singular: string
  word_plural: string
  article_singular: string
  article_plural: string
  translation_ru: string
  translation_ukr: string
  translation_en: string
  book_id: string
  lesson: string
  topic_id: string
  picture: string
  tasks: string
}

type BookField = 'language' | 'name' | 'picture'
type TopicField = 'language' | 'name'
type WordField =
  | 'language'
  | 'book_id'
  | 'topic_id'
  | 'lesson'
  | 'word_singular'
  | 'word_plural'
  | 'article_singular'
  | 'article_plural'
  | 'translation_en'
  | 'translation_ukr'
  | 'translation_ru'
  | 'picture'
  | 'tasks'

type BookErrors = Partial<Record<BookField, string>>
type TopicErrors = Partial<Record<TopicField, string>>
type WordErrors = Partial<Record<WordField, string>>

export default function AdminCreateContentTab({ isOwner }: { isOwner: boolean }) {
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('word')

  const [books, setBooks] = useState<Book[]>([])
  const [topics, setTopics] = useState<Topic[]>([])

  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [bookForm, setBookForm] = useState<BookForm>({
    language: 'DE',
    name: '',
    picture: '',
  })

  const [topicForm, setTopicForm] = useState<TopicForm>({
    language: 'DE',
    name: '',
  })

  const [wordForm, setWordForm] = useState<WordForm>({
    language: 'DE',
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

  const [wordImageFile, setWordImageFile] = useState<File | null>(null)
  const [bookImageFile, setBookImageFile] = useState<File | null>(null)

  const [bookErrors, setBookErrors] = useState<BookErrors>({})
  const [topicErrors, setTopicErrors] = useState<TopicErrors>({})
  const [wordErrors, setWordErrors] = useState<WordErrors>({})

  const [bookSubmitAttempted, setBookSubmitAttempted] = useState(false)
  const [topicSubmitAttempted, setTopicSubmitAttempted] = useState(false)
  const [wordSubmitAttempted, setWordSubmitAttempted] = useState(false)

  const [bookResetKey, setBookResetKey] = useState(0)
  const [wordResetKey, setWordResetKey] = useState(0)

  const languageOptions = [
    { value: 'DE', label: 'DE' },
    { value: 'PT', label: 'PT' },
  ]

  const hasLetter = (v: string) => /[A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁё]/.test((v ?? '').trim())
  const isDash = (v: string) => (v ?? '').trim() === '-'
  const needsArticle = (v: string) => {
    const t = (v ?? '').trim()
    return t.length > 0 && !isDash(t) && hasLetter(t)
  }

  const scrollToTop = () => {
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const isValidHttpUrl = (v: string) => {
    const s = (v ?? '').trim()
    if (!s) return false

    try {
      const u = new URL(s)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }

  const validateBookForm = (f: BookForm): BookErrors => {
    const errs: BookErrors = {}
    if (!f.language) errs.language = 'Choose a language'
    if (!f.name.trim()) errs.name = 'Book name required'

    if (isOwner && f.picture.trim() && !isValidHttpUrl(f.picture)) {
      errs.picture = 'Enter a valid image URL'
    }

    return errs
  }

  const validateTopicForm = (f: TopicForm): TopicErrors => {
    const errs: TopicErrors = {}
    if (!f.language) errs.language = 'Choose a language'
    if (!f.name.trim()) errs.name = 'Topic required'
    return errs
  }

  const validateWordForm = (f: WordForm): WordErrors => {
    const errs: WordErrors = {}
    const cfg = ARTICLES_BY_LANGUAGE[f.language]

    const singular = (f.word_singular ?? '').trim()
    const plural = (f.word_plural ?? '').trim()
    const singArticle = (f.article_singular ?? '').trim().toLowerCase()
    const plArticle = (f.article_plural ?? '').trim().toLowerCase()

    if (!f.language) errs.language = 'Choose a language'
    if (!f.book_id) errs.book_id = 'Choose a book'
    if (!f.topic_id) errs.topic_id = 'Choose a topic'

    const lessonNum = Number(f.lesson)
    if (!Number.isInteger(lessonNum) || lessonNum < 1) {
      errs.lesson = 'Choose a number'
    }

    if (!singular) {
      errs.word_singular = 'Singular form required'
    }

    if (isDash(singular) && !plural) {
      errs.word_plural = 'Plural form required'
    }

    const allowedSing = cfg.singular.map((x) => x.toLowerCase())
    const allowedPl = cfg.plural.map((x) => x.toLowerCase())

    if (singArticle && !allowedSing.includes(singArticle)) {
      errs.article_singular = 'Invalid article'
    }

    if (needsArticle(plural) && !allowedPl.includes(plArticle)) {
      errs.article_plural = 'Article required'
    }

    if (!f.translation_en.trim()) errs.translation_en = 'Translation required'
    if (!f.translation_ukr.trim()) errs.translation_ukr = 'Translation required'
    if (!f.translation_ru.trim()) errs.translation_ru = 'Translation required'

    try {
      JSON.parse(f.tasks || '[]')
    } catch {
      errs.tasks = 'Tasks should be a valid JSON'
    }

    if (isOwner && f.picture.trim() && !isValidHttpUrl(f.picture)) {
      errs.picture = 'Enter a valid image URL'
    }

    return errs
  }

  const setBF = <K extends keyof BookForm>(k: K, v: BookForm[K]) => {
    setBookForm((prev) => {
      const next = { ...prev, [k]: v }
      if (bookSubmitAttempted) {
        setBookErrors(validateBookForm(next))
      }
      return next
    })
  }

  const setTF = <K extends keyof TopicForm>(k: K, v: TopicForm[K]) => {
    setTopicForm((prev) => {
      const next = { ...prev, [k]: v }
      if (topicSubmitAttempted) {
        setTopicErrors(validateTopicForm(next))
      }
      return next
    })
  }

  const setWF = <K extends keyof WordForm>(k: K, v: WordForm[K]) => {
    setWordForm((prev) => {
      const next = { ...prev, [k]: v }
      if (wordSubmitAttempted) {
        setWordErrors(validateWordForm(next))
      }
      return next
    })
  }

  useEffect(() => {
    const cfg = ARTICLES_BY_LANGUAGE[wordForm.language]
    if (!cfg) return

    setWordForm((p) => {
      const sing = (p.article_singular ?? '').trim()
      const pl = (p.article_plural ?? '').trim()

      const singOk = !sing || cfg.singular.includes(sing)
      const plOk = !pl || cfg.plural.includes(pl)

      const next = {
        ...p,
        article_singular: singOk ? p.article_singular : '',
        article_plural: plOk ? p.article_plural : '',
      }

      if (wordSubmitAttempted) {
        setWordErrors(validateWordForm(next))
      }

      return next
    })
  }, [wordForm.language, wordSubmitAttempted])

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

  const refetchAll = async () => {
    const [booksRes, topicsRes] = await Promise.all([
      supabase.from('books').select('id,name,language,picture').order('name', { ascending: true }),
      supabase.from('topics').select('id,name,language').order('name', { ascending: true }),
    ])

    if (booksRes.error) throw booksRes.error
    if (topicsRes.error) throw topicsRes.error

    setBooks((booksRes.data ?? []) as Book[])
    setTopics((topicsRes.data ?? []) as Topic[])
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        setLoading(true)
        await refetchAll()
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  const booksForSelectedLanguage = useMemo(
    () => books.filter((b) => b.language === wordForm.language),
    [books, wordForm.language],
  )

  const topicsForSelectedLanguage = useMemo(
    () => topics.filter((t) => t.language === wordForm.language),
    [topics, wordForm.language],
  )

  const bookOptions = useMemo(() => {
    return booksForSelectedLanguage.map((b) => ({
      value: String(b.id),
      label: b.name,
    }))
  }, [booksForSelectedLanguage])

  const topicOptions = useMemo(() => {
    return topicsForSelectedLanguage.map((t) => ({
      value: String(t.id),
      label: t.name,
    }))
  }, [topicsForSelectedLanguage])

  useEffect(() => {
    setError(null)
    setOk(null)

    setBookErrors({})
    setTopicErrors({})
    setWordErrors({})

    setBookSubmitAttempted(false)
    setTopicSubmitAttempted(false)
    setWordSubmitAttempted(false)

    setWordImageFile(null)
    setBookImageFile(null)
    setWF('picture', '')
    setBF('picture', '')
  }, [mode])

  const submitBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(null)
    setBookSubmitAttempted(true)
    scrollToTop()

    const errs = validateBookForm(bookForm)
    setBookErrors(errs)
    if (Object.keys(errs).length > 0) return

    let pictureUrl = bookForm.picture.trim()
    let uploadedUrlForCleanup: string | null = null

    if (bookImageFile) {
      const baseName = buildBookBase(bookForm.name)
      const uploadedUrl = await uploadWithIncrement(bookImageFile, {
        entity: 'books',
        language: bookForm.language,
        baseName,
      })
      pictureUrl = uploadedUrl
      uploadedUrlForCleanup = uploadedUrl
    } else if (isOwner && pictureUrl) {
      if (!isValidHttpUrl(pictureUrl)) {
        setBookErrors((p) => ({ ...p, picture: 'Enter a valid image URL' }))
        return
      }
    } else {
      setBookErrors((p) => ({ ...p, picture: 'Picture required' }))
      return
    }

    const payload = {
      language: bookForm.language,
      name: bookForm.name.trim(),
      picture: pictureUrl,
    }

    const { error: insErr } = await supabase
      .from('books')
      .insert(payload)
      .select('id,name,language,picture')
      .single()

    if (insErr) {
      if (uploadedUrlForCleanup) {
        try {
          await removeFromImagesBucketByPublicUrl(uploadedUrlForCleanup)
        } catch {}
      }
      setError(insErr.message)
      return
    }

    setOk('Book added ✅')
    setBookImageFile(null)
    setBookForm((p) => ({ ...p, name: '', picture: '' }))
    setBookErrors({})
    setBookSubmitAttempted(false)
    setBookResetKey((k) => k + 1)
    await refetchAll()
  }

  const submitTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(null)
    setTopicSubmitAttempted(true)
    scrollToTop()

    const errs = validateTopicForm(topicForm)
    setTopicErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload = {
      language: topicForm.language,
      name: topicForm.name.trim(),
    }

    const { error: insErr } = await supabase
      .from('topics')
      .insert(payload)
      .select('id,name,language')
      .single()

    if (insErr) {
      setError(insErr.message)
      return
    }

    setOk('Topic added ✅')
    setTopicForm((p) => ({ ...p, name: '' }))
    setTopicErrors({})
    setTopicSubmitAttempted(false)
    await refetchAll()
  }

  const submitWord = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(null)
    setWordSubmitAttempted(true)
    scrollToTop()

    const errs = validateWordForm(wordForm)
    setWordErrors(errs)
    if (Object.keys(errs).length > 0) return

    let pictureUrl = wordForm.picture.trim()
    let uploadedUrlForCleanup: string | null = null

    if (wordImageFile) {
      const topicName = topics.find((t) => String(t.id) === String(wordForm.topic_id))?.name ?? '-'
      const baseName = buildWordBase({
        lesson: wordForm.lesson,
        topicName,
        wordSingular: wordForm.word_singular,
        wordPlural: wordForm.word_plural,
      })

      const uploadedUrl = await uploadWithIncrement(wordImageFile, {
        entity: 'words',
        language: wordForm.language,
        baseName,
      })

      pictureUrl = uploadedUrl
      uploadedUrlForCleanup = uploadedUrl
    } else if (isOwner && pictureUrl) {
      if (!isValidHttpUrl(pictureUrl)) {
        setWordErrors((p) => ({ ...p, picture: 'Enter a valid image URL' }))
        return
      }
    } else {
      setWordErrors((p) => ({ ...p, picture: 'Picture required' }))
      return
    }

    const lessonNum = Number(wordForm.lesson)
    const singular = wordForm.word_singular.trim()
    const plural = wordForm.word_plural.trim()

    let tasksJson: any = []
    try {
      tasksJson = JSON.parse(wordForm.tasks || '[]')
    } catch {
      if (uploadedUrlForCleanup) {
        try {
          await removeFromImagesBucketByPublicUrl(uploadedUrlForCleanup)
        } catch {}
      }
      setWordErrors((p) => ({ ...p, tasks: 'Tasks should be a valid JSON' }))
      return
    }

    const cfg = ARTICLES_BY_LANGUAGE[wordForm.language]
    const singArticle = wordForm.article_singular.trim().toLowerCase()
    const plArticle = wordForm.article_plural.trim().toLowerCase()

    const payload = {
      language: wordForm.language,
      word_singular: singular,
      word_plural: plural || null,
      article_singular:
        singArticle && cfg.singular.map((x) => x.toLowerCase()).includes(singArticle)
          ? singArticle
          : null,
      article_plural:
        plArticle && cfg.plural.map((x) => x.toLowerCase()).includes(plArticle)
          ? plArticle
          : null,
      translation_ru: wordForm.translation_ru.trim(),
      translation_ukr: wordForm.translation_ukr.trim(),
      translation_en: wordForm.translation_en.trim(),
      book_id: Number(wordForm.book_id),
      lesson: lessonNum,
      topic_id: Number(wordForm.topic_id),
      picture: pictureUrl,
      tasks: tasksJson,
    }

    const { error: insErr } = await supabase.from('words').insert(payload)

    if (insErr) {
      if (uploadedUrlForCleanup) {
        try {
          await removeFromImagesBucketByPublicUrl(uploadedUrlForCleanup)
        } catch {}
      }
      setError(insErr.message)
      return
    }

    setOk('Word added ✅')
    setWordImageFile(null)
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
      topic_id: '',
    }))
    setWordErrors({})
    setWordSubmitAttempted(false)
    setWordResetKey((k) => k + 1)
  }

  if (loading) {
    return <p className="pt-10 text-center text-white/60">Loading…</p>
  }

  const FieldError = ({ msg }: { msg?: string }) => (
    <p
      className={[
        'mt-1 min-h-[12px] text-xs leading-4',
        msg ? 'text-red-300' : 'text-transparent',
      ].join(' ')}
    >
      {msg || '\u00A0'}
    </p>
  )

  const ArticleChips = ({
    value,
    options,
    onChange,
    disabled = false,
  }: {
    value: string
    options: string[]
    onChange: (v: string) => void
    disabled?: boolean
  }) => {
    return (
      <div className="flex flex-wrap gap-4">
        {options.map((opt) => {
          const selected = (value ?? '').trim().toLowerCase() === opt.toLowerCase()
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(selected ? '' : opt)}
              className={[
                'rounded-2xl px-6 py-3 text-sm font-semibold border transition',
                selected
                  ? 'bg-white text-slate-950 border-white/10 shadow-lg shadow-white/10'
                  : 'bg-white/10 text-white/90 border-white/10 hover:bg-white/15',
                disabled ? 'opacity-70 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {opt}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-8">
        {MODE_ITEMS.map((m) => (
          <label key={m.key} className="flex items-center gap-2 cursor-pointer select-none rounded-xl py-2 transition">
            <input
              type="radio"
              name="mode"
              value={m.key}
              checked={mode === m.key}
              onChange={() => setMode(m.key)}
              className="sr-only"
            />
            <span
              className={[
                'h-5 w-5 rounded-full border transition flex items-center justify-center',
                mode === m.key ? 'border-violet-400 bg-violet-500/30' : 'border-white/25 bg-white/5',
              ].join(' ')}
              aria-hidden="true"
            >
              <span className={['h-3 w-3 rounded-full transition', mode === m.key ? 'bg-violet-400' : 'bg-transparent'].join(' ')} />
            </span>
            <span className={['text-md text-white/90', mode === m.key ? 'font-semibold' : ''].join(' ')}>
              {m.label}
            </span>
          </label>
        ))}
      </div>

      {error && <div className="mt-5 inline-flex rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-md text-red-200">{error}</div>}
      {ok && <div className="mt-5 inline-flex rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{ok}</div>}

      <div className="mt-6">
        {mode === 'book' ? (
          <form onSubmit={submitBook} noValidate className="grid gap-4">
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-x-12">
              <div className="grid gap-2 sm:col-span-3">
                <label className="text-md text-white/80">Language</label>
                <Select
                  value={bookForm.language}
                  onChange={(v) => {
                    setBF('language', v as Language)
                    setBF('picture', '')
                    setBookImageFile(null)
                  }}
                  options={languageOptions}
                  placeholder="Language"
                />
                <FieldError msg={bookErrors.language} />
              </div>

              <div className="grid gap-2 sm:col-span-5">
                <label className="text-md text-white/80">Book name</label>
                <input
                  value={bookForm.name}
                  onChange={(e) => setBF('name', e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                />
                <FieldError msg={bookErrors.name} />
              </div>
            </div>

            <div className="grid gap-2 mt-6">
              <label className="text-md text-white/80">Picture</label>
              <ImageUploader
                value={bookForm.picture}
                resetKey={bookResetKey}
                deferred
                onPickFile={(file) => {
                  setBookImageFile(file)
                  setBF('picture', '')
                }}
                onError={(msg) => setError(msg)}
                canPick={() => {
                  if (!bookForm.name.trim()) return { ok: false, message: 'Enter book name first.' }
                  return { ok: true }
                }}
              />

              {isOwner && (
                <div className="mt-3 grid gap-2">
                  <input
                    value={bookForm.picture}
                    onChange={(e) => {
                      setBF('picture', e.target.value)
                      if (e.target.value.trim()) {
                        setBookImageFile(null)
                      }
                    }}
                    placeholder="Image URL"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                  />
                </div>
              )}

              <FieldError msg={bookErrors.picture} />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0"
            >
              Save book
            </button>
          </form>
        ) : mode === 'word' ? (
          <form onSubmit={submitWord} noValidate className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-x-5">
              <div className="grid gap-2 sm:col-span-2">
                <label className="text-md text-white/80">Language</label>
                <Select
                  value={wordForm.language}
                  onChange={(v) => {
                    setWF('language', v as Language)
                    setWF('book_id', '')
                    setWF('topic_id', '')
                    setWF('picture', '')
                    setWordImageFile(null)
                  }}
                  options={languageOptions}
                  placeholder="Language"
                />
                <FieldError msg={wordErrors.language} />
              </div>

              <div className="grid gap-2 sm:col-span-4">
                <label className="text-md text-white/80">Book</label>
                <Select
                  value={wordForm.book_id}
                  onChange={(v) => {
                    setWF('book_id', v)
                    setWordImageFile(null)
                    setWF('picture', '')
                  }}
                  options={bookOptions}
                  placeholder="- choose -"
                />
                <FieldError msg={wordErrors.book_id} />
              </div>

              <div className="grid gap-2 sm:col-span-4">
                <label className="text-md text-white/80">Topic</label>
                <Select
                  value={wordForm.topic_id}
                  onChange={(v) => {
                    setWF('topic_id', v)
                    setWordImageFile(null)
                    setWF('picture', '')
                  }}
                  options={topicOptions}
                  placeholder="- choose -"
                />
                <FieldError msg={wordErrors.topic_id} />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <label className="text-md text-white/80">Lesson</label>
                <input
                  value={wordForm.lesson}
                  onChange={(e) => setWF('lesson', e.target.value)}
                  type="number"
                  min={1}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                />
                <FieldError msg={wordErrors.lesson} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-white font-semibold text-base leading-none">Word</p>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm text-white/60">Singular</label>
                    <input
                      value={wordForm.word_singular}
                      onChange={(e) => setWF('word_singular', e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                    />
                    <FieldError msg={wordErrors.word_singular} />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm text-white/60">Plural</label>
                    <input
                      value={wordForm.word_plural}
                      onChange={(e) => setWF('word_plural', e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                    />
                    <FieldError msg={wordErrors.word_plural} />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-white font-semibold text-base leading-none">Article</p>
                {(() => {
                  const cfg = ARTICLES_BY_LANGUAGE[wordForm.language]
                  return (
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <div className="grid gap-2">
                        <label className="text-sm text-white/60">Singular</label>
                        <ArticleChips
                          value={wordForm.article_singular}
                          options={cfg.singular}
                          onChange={(v) => setWF('article_singular', v)}
                        />
                        <FieldError msg={wordErrors.article_singular} />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm text-white/60">Plural</label>
                        <ArticleChips
                          value={wordForm.article_plural}
                          options={cfg.plural}
                          onChange={(v) => setWF('article_plural', v)}
                        />
                        <FieldError msg={wordErrors.article_plural} />
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-start border border-white/10 bg-white/5 rounded-2xl p-5">
              <div className="sm:col-span-12">
                <p className="text-white font-semibold text-base leading-none">Translations</p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-x-4">
                  <div className="grid gap-2 sm:col-span-4">
                    <label className="text-sm text-white/60">English</label>
                    <input
                      value={wordForm.translation_en}
                      onChange={(e) => setWF('translation_en', e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                    />
                    <FieldError msg={wordErrors.translation_en} />
                  </div>

                  <div className="grid gap-2 sm:col-span-4">
                    <label className="text-sm text-white/60">Ukrainian</label>
                    <input
                      value={wordForm.translation_ukr}
                      onChange={(e) => setWF('translation_ukr', e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                    />
                    <FieldError msg={wordErrors.translation_ukr} />
                  </div>

                  <div className="grid gap-2 sm:col-span-4">
                    <label className="text-sm text-white/60">Russian</label>
                    <input
                      value={wordForm.translation_ru}
                      onChange={(e) => setWF('translation_ru', e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                    />
                    <FieldError msg={wordErrors.translation_ru} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 sm:items-stretch">
              <div className="grid gap-2 sm:col-span-2 h-full">
                <label className="text-md text-white/80">Picture</label>

                <div className="flex h-full min-h-0 flex-col gap-3">
                  <div className="flex-1 min-h-0">
                    <ImageUploader
                      value={wordForm.picture}
                      resetKey={wordResetKey}
                      deferred
                      onPickFile={(file) => {
                        setWordImageFile(file)
                        setWF('picture', '')
                      }}
                      canPick={() => {
                        const lessonNum = Number(wordForm.lesson)
                        if (!Number.isFinite(lessonNum) || lessonNum < 1) {
                          return { ok: false, message: 'Enter correct lesson number.' }
                        }
                        if (!wordForm.topic_id.trim()) {
                          return { ok: false, message: 'Select a topic first.' }
                        }

                        const singular = wordForm.word_singular.trim()
                        const plural = wordForm.word_plural.trim()

                        if (!singular) return { ok: false, message: 'Enter word (singular) first.' }
                        if (singular === '-' && !plural) {
                          return { ok: false, message: 'If singular is "-", enter plural first.' }
                        }

                        return { ok: true }
                      }}
                      onError={(msg) => setError(msg)}
                    />
                  </div>

                  {isOwner && (
                    <input
                      value={wordForm.picture}
                      onChange={(e) => {
                        setWF('picture', e.target.value)
                        if (e.target.value.trim()) {
                          setWordImageFile(null)
                        }
                      }}
                      placeholder="Image URL"
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                    />
                  )}
                </div>

                <FieldError msg={wordErrors.picture} />
              </div>

              <div className="grid gap-2 sm:col-span-4 h-full">
                <label className="text-md text-white/80">Tasks (optional)</label>

                <textarea
                  value={wordForm.tasks}
                  onChange={(e) => setWF('tasks', e.target.value)}
                  className={[
                    'h-full min-h-[320px] w-full resize-none',
                    'rounded-2xl border border-white/15 bg-white/10 px-4 py-3',
                    'text-white outline-none',
                    'focus:border-white/25 focus:ring-2 focus:ring-white/10',
                    'font-mono text-sm leading-5',
                  ].join(' ')}
                  placeholder="[]"
                />

                <FieldError msg={wordErrors.tasks} />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0"
            >
              Save word
            </button>
          </form>
        ) : (
          <form onSubmit={submitTopic} noValidate className="grid gap-4">
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-x-12">
              <div className="grid gap-2 sm:col-span-3">
                <label className="text-md text-white/80">Language</label>
                <Select
                  value={topicForm.language}
                  onChange={(v) => setTF('language', v as Language)}
                  options={languageOptions}
                  placeholder="Language"
                />
                <FieldError msg={topicErrors.language} />
              </div>

              <div className="grid gap-2 sm:col-span-5">
                <label className="text-md text-white/80">Topic name</label>
                <input
                  value={topicForm.name}
                  onChange={(e) => setTF('name', e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                />
                <FieldError msg={topicErrors.name} />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0"
            >
              Save topic
            </button>
          </form>
        )}
      </div>
    </>
  )
}