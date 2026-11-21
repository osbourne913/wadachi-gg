// Sharing the report: an image made in the browser, previewed here, then handed
// to the phone's share sheet (which can pass it straight to X) or saved, with
// the post text ready. Nothing is uploaded by this page.

import {useEffect, useState} from 'react';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Button} from '@astryxdesign/core/Button';
import {Switch} from '@astryxdesign/core/Switch';
import {Icon} from '@astryxdesign/core/Icon';
import {Copy, Download, Share2} from 'lucide-react';
import {SITE} from '../site';
import type {Report} from '../lib/riot/types';
import {canShare, canvasToBlob, drawShareImage, shareText, SHARE_HEIGHT, SHARE_WIDTH, type ShareOptions} from '../lib/shareImage';
import {SectionHeading} from './parts';

const FILE_NAME = 'wadachi-gg.png';

export function ShareSection({report}: {report: Report}) {
  const [opts, setOpts] = useState<ShareOptions>({showRiotId: false, showSpend: false});
  const [image, setImage] = useState<{blob: Blob; url: string} | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const text = shareText(report, opts);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    drawShareImage(report, opts)
      .then(canvasToBlob)
      .then(blob => {
        if (alive) {
          url = URL.createObjectURL(blob);
          setImage({blob, url});
        }
      })
      .catch(() => setNote('画像を作れませんでした。'));
    return () => {
      alive = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [report, opts]);

  if (!canShare(report)) {
    return null;
  }

  const file = image ? new File([image.blob], FILE_NAME, {type: 'image/png'}) : null;
  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({files: [file]});

  const post = async () => {
    setNote(null);
    if (file && canShareFile) {
      try {
        await navigator.share({files: [file], text: `${text}\n${SITE.url}`});
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          return;
        }
      }
    }
    // No share sheet with files (most computers): open the post form, and the image is saved for attaching.
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE.url)}`;
    window.open(intent, '_blank', 'noopener');
    save();
    setNote('投稿画面を開きました。保存した画像を投稿に添付してください。');
  };

  const save = () => {
    if (!image) {
      return;
    }
    const a = document.createElement('a');
    a.href = image.url;
    a.download = FILE_NAME;
    a.click();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${SITE.url}`);
      setNote('投稿の文章をコピーしました。');
    } catch {
      setNote('コピーできませんでした。');
    }
  };

  return (
    <VStack gap={4}>
      <SectionHeading id="share" title="シェア" hint="画像はこの画面の中で作っています。ボタンを押すまで、どこにも送られません。" />
      <Card padding={5}>
        <VStack gap={5}>
          <div className="share-preview" style={{aspectRatio: `${SHARE_WIDTH} / ${SHARE_HEIGHT}`}}>
            {image ? <img src={image.url} alt="シェア用の画像のプレビュー" /> : null}
          </div>
          <HStack gap={6} wrap="wrap">
            <Switch label="Riot IDを載せる" value={opts.showRiotId} isDisabled={!report.riotId} onChange={v => setOpts(o => ({...o, showRiotId: v}))} />
            <Switch label="課金額を載せる" value={opts.showSpend} isDisabled={!report.spend} onChange={v => setOpts(o => ({...o, showSpend: v}))} />
          </HStack>
          <VStack gap={2}>
            <Text type="label" color="secondary">
              投稿の文章
            </Text>
            <pre className="share-text">{`${text}\n${SITE.url}`}</pre>
          </VStack>
          <HStack gap={3} wrap="wrap">
            <Button label="Xに投稿" variant="primary" icon={<Icon icon={Share2} size="sm" />} onClick={post} isDisabled={!image} />
            <Button label="画像を保存" variant="secondary" icon={<Icon icon={Download} size="sm" />} onClick={save} isDisabled={!image} />
            <Button label="文章をコピー" variant="secondary" icon={<Icon icon={Copy} size="sm" />} onClick={copy} />
          </HStack>
          {note ? (
            <Text type="supporting" color="secondary" role="status">
              {note}
            </Text>
          ) : null}
        </VStack>
      </Card>
    </VStack>
  );
}
