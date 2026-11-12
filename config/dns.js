// Optional: DNS_SERVERS=8.8.8.8,1.1.1.1 makes Node resolve the Atlas "mongodb+srv" SRV record through these servers.
// Needed on machines whose local resolver refuses SRV lookups (error: "querySrv ECONNREFUSED").
const dns = require('dns');

module.exports = () => {
    const servers = (process.env.DNS_SERVERS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (servers.length) dns.setServers(servers);
};
