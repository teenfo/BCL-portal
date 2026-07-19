-- 아바타 Storage 정책 보강 — 기존 `avatars` 버킷(public, INSERT+SELECT만 존재)에
-- 본인 폴더 UPDATE/DELETE 정책 추가. upsert 덮어쓰기(같은 경로 재업로드)는 UPDATE 권한 필요.
-- 경로 규약: `{auth.uid()}/avatar.<ext>` — 첫 세그먼트가 소유자 uid. 공유 멀티버킷 정책 비접촉.
DROP POLICY IF EXISTS "avatars own update" ON storage.objects;
CREATE POLICY "avatars own update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "avatars own delete" ON storage.objects;
CREATE POLICY "avatars own delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);
