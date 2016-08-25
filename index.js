const popsicle = require('popsicle');
const serverTypes = require('./server_types');
const config = require('./config.json');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: true,
  auth: {
    user: config.email.user,
    pass: config.email.password
  }
});

const OVH_URL = 'https://ws.ovh.com/dedicated/r2/ws.dispatcher/getAvailability2';

const desireds = config.desireds;

const getServerReference = name => {
  return Object.keys(serverTypes).find(key => serverTypes[key] === name);
};

const isServerAvailable = server => {
  return !server.zones.every(zone => {
    return zone.availability === 'unavailable' || zone.availability === 'unknown';
  });
};

const processServers = servers => {
  desireds.forEach(desired => {
    const reference = getServerReference(desired);
    const server = servers.find(server => server.reference === reference);
    if (!server) {
      throw new Error(`Server not found for reference ${reference}`);
    }
    if (isServerAvailable(server)) {
      console.log(`Server ${desired} available`);
      transporter.sendMail({
        from: config.email.user,
        to: config.email.to,
        subject: `Server ${desired} available ✔`,
        html: '<a href="https://www.kimsufi.com/es/servidores.xml">kimsufi</a>'
      });
    }
  });
};

const loop = () => {
  popsicle.request(
    {
      url: OVH_URL,
      headers: {
        'Referer': 'https://www.kimsufi.com/es/servidores.xml',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
      }
    })
    .use(popsicle.plugins.parse('json'))
    .then(res => {
      processServers(res.body.answer.availability);
      setTimeout(loop, 20*1000);
    })
    .catch(err => {
      console.error(err);
      setTimeout(loop, 20*1000);
    });
};

loop();
