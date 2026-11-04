import checkIcon from '../assets/jira-ticket/check.svg'
import tagIcon from '../assets/jira-ticket/tag-development.svg'
import userIcon from '../assets/jira-ticket/memoji-user.svg'
import warningIcon from '../assets/jira-ticket/warning-circle.svg'
import './JiraTicket.css'

/* Figma: Specto Website › "Jira mock ticket" (6580:164608).
   Ticket key, done-check + title, a product tag, assignee avatars + team,
   and a priority marker. */

export type JiraTicketProps = {
  ticketKey: string
  title: string
  tag: string
  team: string
  priority: string
}

function Memoji({ className = '' }: { className?: string }) {
  return (
    <span className={`jira-ticket-memoji ${className}`}>
      <span className="jira-ticket-memoji-icon">
        <img src={userIcon} alt="" width={11.812} height={11.3951} />
      </span>
    </span>
  )
}

export default function JiraTicket({ ticketKey, title, tag, team, priority }: JiraTicketProps) {
  return (
    <article className="jira-ticket">
      <div className="jira-ticket-header">
        <p className="jira-ticket-key font-mono">{ticketKey}</p>
        <div className="jira-ticket-title-row">
          <span className="jira-ticket-check" aria-label="Done" role="img">
            <img src={checkIcon} alt="" width={12} height={12} />
          </span>
          <h3 className="jira-ticket-title font-zero">{title}</h3>
        </div>
      </div>

      <div className="jira-ticket-tags">
        <span className="jira-ticket-tag">
          <img src={tagIcon} alt="" width={8.08115} height={7.01949} />
          <span className="jira-ticket-tag-label font-zero">{tag}</span>
        </span>
      </div>

      <div className="jira-ticket-footer">
        <div className="jira-ticket-team">
          <span className="jira-ticket-avatars" aria-hidden="true">
            <Memoji />
            <Memoji className="jira-ticket-memoji-faded" />
          </span>
          <span className="jira-ticket-meta jira-ticket-meta-strong font-zero">{team}</span>
        </div>
        <div className="jira-ticket-priority">
          <img src={warningIcon} alt="" width={16} height={16} />
          <span className="jira-ticket-meta font-zero">{priority}</span>
        </div>
      </div>
    </article>
  )
}
