import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';

export async function GET({ url }) {
  const lessonId = url.searchParams.get('lessonId');
  const locale = url.searchParams.get('locale');
  const endRange = Number(url.searchParams.get('endRange') || '20');

  if (!lessonId || !locale) {
    return json({ success: false, message: 'lessonId and locale required' }, { status: 400 });
  }

  try {
    // Find the lesson language entry
    const lessonLanguage = await prisma.lessonLanguage.findFirst({ where: { lesson_id: lessonId, locale } });

    if (!lessonLanguage) {
      return json({ success: true, data: [] });
    }

    // Fetch history entries
    const histories = await prisma.lessonLanguageHistory.findMany({
      where: { lesson_language_id: lessonLanguage.id },
      orderBy: { timestamp: 'desc' },
      take: endRange
    });

    // Map to legacy shape expected by frontend
    const result = histories.map((h) => ({
      new_content: h.new_content,
      old_content: h.old_content,
      timestamp: h.timestamp,
      locale,
      lesson_id: lessonId
    }));

    return json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}

export async function POST({ request }) {
  const { lesson_id, locale, content } = await request.json();

  if (!lesson_id || !locale || content === undefined) {
    return json({ success: false, message: 'Missing params' }, { status: 400 });
  }

  try {
    // Upsert lesson language
    const existing = await prisma.lessonLanguage.findFirst({ where: { lesson_id, locale } });

    if (existing) {
      const old_content = existing.content;
      const updated = await prisma.lessonLanguage.update({ where: { id: existing.id }, data: { content } });

      // Create history record
      await prisma.lessonLanguageHistory.create({ data: { lesson_language_id: existing.id, old_content, new_content: content } });

      return json({ success: true, data: updated });
    } else {
      const created = await prisma.lessonLanguage.create({ data: { lesson_id, locale, content } });

      // Optionally create initial history (old_content null)
      await prisma.lessonLanguageHistory.create({ data: { lesson_language_id: created.id, old_content: null, new_content: content } });

      return json({ success: true, data: created });
    }
  } catch (err) {
    console.error(err);
    return json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}