import { next } from '@vercel/functions';
import { timingSafeEqual } from 'node:crypto';

/**
 * 全ページに Basic 認証をかける Routing Middleware。
 *
 * matcher を設定していないため、HTML・CSS・画像・robots.txt を含む
 * すべてのリクエストがこの関数を通る（＝認証なしでは何も取得できない）。
 *
 * 認証情報はソースに書かず、Vercel の環境変数
 * BASIC_AUTH_USER / BASIC_AUTH_PASSWORD からのみ読む。
 * どちらかが未設定なら、すべてのリクエストを 401 で拒否する（fail closed）。
 * これにより、このリポジトリが公開されていてもパスワードは漏れない。
 */
const USER = process.env.BASIC_AUTH_USER;
const PASS = process.env.BASIC_AUTH_PASSWORD;

const REALM = 'Missiona Proposal';

/** 文字列長の差で情報が漏れないように、固定長ハッシュ相当の比較を行う */
function safeEqual(a, b) {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) {
    // 長さが違う場合も同じだけ時間をかけてから false を返す
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

function unauthorized() {
  return new Response(
    [
      '401 Unauthorized',
      '',
      'このサイトは株式会社ミショナ様への提出物です。',
      'ブラウザのダイアログにユーザー名とパスワードを入力してください。',
      '',
      'This page is password protected.',
    ].join('\n'),
    {
      status: 401,
      headers: {
        'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
      },
    },
  );
}

export default function middleware(request) {
  // 環境変数が未設定なら誰も通さない。設定ミスで全公開になる事故を防ぐ。
  if (!USER || !PASS) {
    return unauthorized();
  }

  const header = request.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');

  if (!encoded || !/^basic$/i.test(scheme || '')) {
    return unauthorized();
  }

  let decoded;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return unauthorized();
  }

  // パスワードに ':' が含まれても壊れないよう、最初の ':' だけで分割する
  const sep = decoded.indexOf(':');
  if (sep < 0) return unauthorized();

  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);

  // 片方だけ短絡評価しないよう、両方必ず評価する
  const okUser = safeEqual(user, USER);
  const okPass = safeEqual(pass, PASS);

  if (!(okUser && okPass)) {
    return unauthorized();
  }

  // 認証OK。本来のレスポンスへ進む。
  // noindex の X-Robots-Tag は vercel.json の headers で全パスに付与しているため、
  // ここでは重複して付けない（同じ値が2回返るのを避ける）。
  return next();
}
