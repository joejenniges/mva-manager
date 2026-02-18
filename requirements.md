# Overview
This is a simple node based webapp that will be backed by postgres for managing doctor visits, insurance, and other billing items associated with doctor visits. The end goal is to support the ability to manage a complete lifecycle of documentation after a motor vehicle accident for record keeping.

## Requirements:
- Authentication login with google, look at the journaling-service repo for how auth works with google.
  - Only allow certain emails to access the site, configured via comma separated list in .env
- Entities to include at a minimum:
  - User: Someone who logs into the website using google, has an email associated with their user record
  - Person: A physical person who can be recorded as having medical records, can be tied to a user
    - A person can be marked as a patient, a doctor, chiropractor, physical therapist, etc.
    - A person marked as a patient is considered separate from the other options and should take priority in being displayed
    - Should include a phone number, email address, and freeform note field.
  - Location: A physical location where a doctor procedure or other activity has taken place
    - Locations should include an address, city, state, and zip
    - Locations should have a title so they can be displayed on Organizations
    - A person can have a location, this is for Patient Persons so they can set a home location
  - Organization: A business or other entity who performs services, has one or more locations and one or more persons
    - If organization has multiple locations, they should be clearly marked next to the organization name, though this most likely won't occur and is bottom on the priority list
    - Should include a phone number, email address, and freeform note field.
  - Activity: What sort of activity occurred at the organization/location. Including things like massage, x-ray, ct scan, IV fluids, etc.
    - Activities will be used like tags and will be attached to events
  - Event: A combination of an Organization and one or more Person performing one or more Activity on a Person who is a patient.
    - Events must have a calendar date time, including ones in the past and one scheduled for the future.
    - Events in the future should have an Organization and Person(patient) attached to it, but not necessarily activities since they may not be known at the time
    - Events should also include a freeform notes column
    - Events should have the ability to upload documents
    - Events should have a cost associated with it. An aggregate charge should be allowed but additional line items can be added with billing codes (from explanation of benefits)
  - Document: A file (pdf, jpeg, and png most common types that will be used) that will be associated with an Event, Activity, Organization, or Person
    - Documents should be viewed inline on a webpage, including a PDF viewer
    - One document can be associated to multiple events, this is critical as sometimes 1 Explanation of Benefits can be for multiple doctor visits (activities)
  - DocumentType: A list of document types, including standard ones like Explanation of Benefits, Bill, Insurance Card, Business Card, etc.
    - Should support a file naming template field with auto population fields. For example: `{Patient} {DocumentType} {Organization}`

## Screens:
  - Entity CRUD screens for User, Person, Location, Organization, Activity, Document, and DocumentType
    - All of these pages should show items in a table/list with searching and filtering capabilities.
    - Activity and DocumentType will be simple with just the field to define the Title and set a Color for the background of its tag
    - Other screens should include existing fields described above in the Entitities section. Color tags should be optional but allowable for Person and Organization
    - Document screen should allow "unorganized" documents that aren't associated with an event. It should be a separate category that can be easily filtered for.
  - Event screen
    - Contains a view displaying the event title at the top, below will show the Organization and its location. Below that will show the Person who is the patient
    - Below the top view should be the date/time and a map showing the location of the event. A button should be provided that when clicked on a mobile device, will allow the user to open their GPS to that location
    - A section that allows a user to upload a document with a document type. The document upload should be done with a small/medium drop area to drag a document, or the ability to click and open a file explorer dialog. Once a file is chosen, the ability to assign it a title and Document Type should be provided. Document type should come first and if it has a naming template, will populate the Title field and fill in any variables associated with that template.
        - Once documenets are uploaded they should be viewable on the event screen. Documents should be grouped by Document Type with the Document Type being in the header between each group.
  - Calendar screen:
    - Ability to switch between a monthly view with each event happening on that day, or a weekly view that shows a vertical waterfall of times. Check for 3rd party libraries that support this on a front end. 
    - Ability to quickly add new activities to the calendar. Should support a saved template system. For example: If I click to add an appointment and then click "From Template" it should have a dropdown with "Chiropractor" which will fill in a predetermined Organization, Location, and provide the ability to choose a patient and what date/time. I say this because we often have chiropractor appointments at the same time and location for 2 patients on mondays and wednesdays at the same time. I want the ability to add these to be super simple.

## Other Requirements:
  An event should have a "distance" calculation, this will be between two locations, one location being where the Organization is located, the other being the Home location by default which is attached to the Patient person. A driving distance should be calculated for reimbursement purposes, so include both the distance to and the distance back home. 

## Technical items:
- Node backend using Express 5 with a react/vite frontend SPA. Both should be easily deployed with a single command (see journaling-service for some references)
- Postgres backend
- Tailwind CSS styling supporting dark theme out of the box
- Both this app and postgres deployed in docker containers using docker compose