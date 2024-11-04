function formatToGoogleCalendarDate(timestamp: number): string {
    console.log(typeof timestamp);
    timestamp = Number(timestamp);
    // Ensure timestamp is a valid number
    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
        throw new Error(`Invalid timestamp: ${timestamp}`);
    }

    const date = new Date(timestamp);

    // Validate date object
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date created from timestamp: ${timestamp}`);
    }
    // Format to YYYYMMDDTHHMMSS
   // const formatted = date.toISOString()
   //     .replace(/[-:]/g, '')  // Remove dashes and colons
   // .replace(/\.\d{3}Z/, ''); // Remove milliseconds and Z
   //  const tzOffset = date.getTimezoneOffset();
   //  const tzHours = Math.floor(Math.abs(tzOffset) / 60).toString().padStart(2, '0');
   //  const tzmMinuetes = (Math.abs(tzOffset) % 60).toString().padStart(2, '0');
   //  const tzSign = tzOffset <= 0? '+' : '-';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minuets = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    console.log(`${year}${month}${day}T${hours}${minuets}${seconds}Z`)

    //return formatted;
    return `${year}${month}${day}T${hours}${minuets}${seconds}Z`;
}

export default function getGoogleCalendarLink(title:string, description:string, startDate:number, endDate:number) {
    const uriTitle = encodeURIComponent(title);
    const uriDescription = encodeURIComponent(description);
    const uriLocation = encodeURIComponent("101st Deployments Channel");
    const formattedStart = formatToGoogleCalendarDate(startDate);
    const formattedEnd = formatToGoogleCalendarDate(endDate);
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${uriTitle}&dates=${formattedStart}/${formattedEnd}&details=${uriDescription}&location=${uriLocation}&sf=true&output=xml`;
}

// let googleCalendarLink;
// try {
//     const startTime = Number(deployment.startTime);
//     const endTime = Number(deployment.endTime);
//
//     if (isNaN(startTime) || isNaN(endTime)) {
//         throw new Error('Invalid start or end time');
//     }
//
//     googleCalendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${
//         encodeURIComponent(deployment.title)
//     }&dates=${
//         formatToGoogleCalendarDate(startTime)
//     }/${
//         formatToGoogleCalendarDate(endTime)
//     }&details=${
//         encodeURIComponent(deployment.description)
//     }&location=${
//         encodeURIComponent("101st Deployments Channel")
//     }&sf=true&output=xml`;
// } catch (error) {
//     console.error('Failed to generate calendar link:', error);
//     googleCalendarLink = '#'; // Fallback link if date formatting fails
// }