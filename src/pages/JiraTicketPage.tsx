import JiraTicket from '../components/JiraTicket'
import './JiraTicketPage.css'

export default function JiraTicketPage() {
  return (
    <main className="jira-ticket-page">
      <JiraTicket
        ticketKey="SPEC-11"
        title="Specto’s Website - v8"
        tag="Development"
        team="Development Team"
        priority="Highest Priority"
      />
    </main>
  )
}
