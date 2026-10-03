import { DOWNLOADS, downloadsFor, formatBytes, totalBytes, type DownloadItem } from '../app/downloads'

// What a first visit downloads and how big, shown before anything starts
// (UX.md: downloads). Shared rows once, then the one row that depends on the
// mode, then the avatar, which only a video interview needs.
export function DownloadList() {
  const shared = DOWNLOADS.filter((d) => !d.modes && !d.displays)
  const byId = (id: string) => DOWNLOADS.find((d) => d.id === id)!

  return (
    <table className="downloads">
      <caption>What downloads the first time</caption>
      <thead>
        <tr>
          <th scope="col">Model</th>
          <th scope="col" className="size">
            Size
          </th>
        </tr>
      </thead>
      <tbody>
        {shared.map((d) => (
          <Row key={d.id} item={d} />
        ))}
        <Row item={byId('gemma-light')} note="Light" />
        <Row item={byId('gemma-heavy')} note="Heavy" />
        <Row item={byId('avatar')} note="video interview only" />
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total, Light / Heavy</th>
          <td className="size">
            {formatBytes(totalBytes(downloadsFor('light')))} /{' '}
            {formatBytes(totalBytes(downloadsFor('heavy')))}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

function Row({ item, note }: { item: DownloadItem; note?: string }) {
  return (
    <tr>
      <td>
        <span className="download-name">{item.name}</span>
        <span className="download-job">
          {item.job}
          {note && ` (${note})`}
        </span>
      </td>
      <td className="size">{formatBytes(item.bytes)}</td>
    </tr>
  )
}
