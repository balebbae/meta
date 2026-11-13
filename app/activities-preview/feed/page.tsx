import {PreviewThread} from '../PreviewThread';

/** Dev-only: a stand-in Facebook page outside Activities mode, to check that leaving restores the stock chrome and
 *  to see the challenge cards on a Messenger-like surface. */
export default function FeedPreview() {
  return (
    <div style={{display: 'grid', gap: 16}}>
      <div className="fb-card" style={{padding: 16}}>
        <div style={{fontSize: 17, fontWeight: 600}}>Facebook, outside Activities</div>
        <p className="fb-text-secondary" style={{margin: '4px 0 0'}}>
          The chrome around this card is the stock Facebook one. Open Activities to watch it re-tint, come back to watch it restore.
        </p>
      </div>
      <div className="fb-card" style={{padding: 16}}>
        <div style={{fontWeight: 600, marginBottom: 12}}>Dallas Run Club · group chat</div>
        <PreviewThread />
      </div>
    </div>
  );
}
