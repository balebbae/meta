import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isPushEndpoint} from './push-endpoint.ts';
import {isAllowedImageUrl} from './image-upload.ts';
import {appOrigin} from './activities/origin.ts';

test('push endpoints: only real push services over https', () => {
  assert.ok(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc'));
  assert.ok(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc'));
  assert.ok(isPushEndpoint('https://web.push.apple.com/QaBc'));
  assert.equal(isPushEndpoint('http://fcm.googleapis.com/fcm/send/abc'), false);
  assert.equal(isPushEndpoint('https://169.254.169.254/latest/meta-data'), false);
  assert.equal(isPushEndpoint('https://fcm.googleapis.com.evil.com/x'), false);
  assert.equal(isPushEndpoint('https://fcm.googleapis.com:8443/x'), false);
  assert.equal(isPushEndpoint('https://user@fcm.googleapis.com/x'), false);
  assert.equal(isPushEndpoint('not a url'), false);
});

test('attached images: http(s) links or image data URLs under the cap', () => {
  assert.ok(isAllowedImageUrl('https://images.unsplash.com/photo.jpg'));
  assert.ok(isAllowedImageUrl('data:image/jpeg;base64,/9j/4AAQ'));
  assert.equal(isAllowedImageUrl('javascript:alert(1)'), false);
  assert.equal(isAllowedImageUrl('data:text/html;base64,PHNjcmlwdD4='), false);
  assert.equal(isAllowedImageUrl(`data:image/png;base64,${'A'.repeat(2_000_000)}`), false);
  assert.equal(isAllowedImageUrl(`https://x.com/${'a'.repeat(3000)}`), false);
});

test('OAuth origin: spoofed hosts fall back to the configured app URL', () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://meta-activities.vercel.app';
  const req = (host: string) => new Request('https://internal/', {headers: {'x-forwarded-host': host, 'x-forwarded-proto': 'https'}});
  assert.equal(appOrigin(req('meta-activities.vercel.app')), 'https://meta-activities.vercel.app');
  assert.equal(appOrigin(req('meta-git-pr-18.vercel.app')), 'https://meta-git-pr-18.vercel.app');
  assert.equal(appOrigin(req('evil.example.com')), 'https://meta-activities.vercel.app');
  assert.equal(appOrigin(req('evil.com/path')), 'https://meta-activities.vercel.app');
});
