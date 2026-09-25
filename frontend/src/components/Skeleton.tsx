interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = '1rem', borderRadius = '8px', style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="stat-card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
      <Skeleton width={44} height={44} borderRadius={12} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Skeleton width="60%" height="0.7rem" />
        <Skeleton width="40%" height="1.5rem" />
        <Skeleton width="50%" height="0.7rem" />
      </div>
    </div>
  )
}

export function SkeletonListItem() {
  return (
    <div className="list-item" style={{ padding: '1rem', border: '1px solid var(--border)', background: 'white' }}>
      <Skeleton width={48} height={48} borderRadius={12} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <Skeleton width="50%" height="0.9rem" />
        <Skeleton width="30%" height="0.7rem" />
      </div>
      <Skeleton width="80px" height="0.9rem" />
    </div>
  )
}

export function SkeletonPage() {
  return (
    <div className="content-stack animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Skeleton width={220} height="1.6rem" />
          <Skeleton width={320} height="0.85rem" />
        </div>
        <Skeleton width={140} height={44} borderRadius={12} />
      </div>
      <div className="stats-grid">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <div className="panel-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <SkeletonListItem /><SkeletonListItem /><SkeletonListItem /><SkeletonListItem /><SkeletonListItem />
      </div>
    </div>
  )
}
