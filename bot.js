require('dotenv').config();
const Discord = require('discord.js');
const {Client, MessageEmbed } = require('discord.js');
const client = new Client({partials: ['MESSAGE','REACTION']});
const db = require ('./database');
const Ticket = require('./models/Ticket');
const TicketConfig = require('./models/TicketConfig');
const sleep = require ('sleep.js');
const { channel } = require('diagnostics_channel');
const { Z_NO_COMPRESSION } = require('zlib');
const owner = 'dc id';


client.once('ready', () => {
    console.log('Bot aktif ve Bağlandı');
    db.authenticate()
    .then(() => {
        console.log('Veritabanına Bağlandı');
        Ticket.init(db);
        TicketConfig.init(db);
        Ticket.sync();
        TicketConfig.sync();
    
    }).catch((err) => console.log(err));
});


client.on('message', async (message , channel) => {
    if (message.content.toLowerCase() === '!yardim'){
        message.delete({ timeout: 1000})
        const helpEmbed = new MessageEmbed()
        .setTitle('Ticket Bot - Yardim') 
        .setDescription('**Admin Komutları:**\n!setup - Ticketların Nasıl çalışacagını ve yapılandırmasını ayarlar. \n!yardim - Bu komut bu ekranı gösterir.')
        .setColor('#f1db62')
        .setFooter('Test')
        .setAuthor('Çağrı')
        message.channel.type == ('*dm*') + message.author.send(helpEmbed);
    }
    if (message.content.toLowerCase() === '!ticket'){
        const TicketEmbed = new MessageEmbed()
        .setTitle('**Yeni Ticket Oluşturmak İçin Aşağıdaki İfadeye Tıklayın**')

        message.channel.send(TicketEmbed);
        message.channel.send('Mesaj ID sini kopyalın ve mesajı silin. ID yi !setup da kullanın.' )

    }
    if (message.author.bot || message.channel.type === 'dm') return;

    if (message.content.toLowerCase() === '!setup' && message.guild.ownerID === message.author.id){

        try{
            const filter = (m) => m.author.id === message.author.id;
            message.channel.send('Lütfen Bu Ticket için Mesaj ID sini girin.');
            const msgID = (await message.channel.awaitMessages(filter, { max: 1})).first().content;
            const fetchMsg = await message.channel.messages.fetch(msgID);
            message.channel.send('Lütfen Ticketların Gösterileceği ve Kurulacağı Kategori ID sini giriniz.');
            const categoryID = (await message.channel.awaitMessages(filter, { max: 1})).first().content;
            const categoryChannel = client.channels.cache.get(categoryID);
            message.channel.send('Lütfen Bütün Ticketlara Erişmesini İstediğiniz Rölü Giriniz.');
            const roles = (await message.channel.awaitMessages(filter, { max: 1})).first().content.split(/,\s*/);
            console.log(roles)
            if (fetchMsg & categoryChannel) {
                for (const roleID of roles)
                if(!message.guild.roles.cache.get(roleID)) throw new Error('Rol Bulunamadı.'),
                message.channel.send.apply('Girdiğiniz Rol Bulunamadı!. Lütfen Kurulumu Tekrar Yapın.'),
                console.log(err);


                const ticketConfig = await TicketConfig.create({
                    messageId: msgID,
                    guildId: message.guild.id,
                    roles: JSON.stringify(roles),
                    parentId: categoryChannel.id,
                });
                message.channel.send('Ayar Veritabanına Kaydedildi.Eski Kurulum Mesajlarını Silmek için İfadeye Tıklayınız.'),
                await fetchMsg.react('📩');
            } else throw new Error('Geçersz Alan');
        


        } catch (err){
            console.log(err);
            message.channel.send("Yanlış cevap Lütfen Doğru ID yi giriniz")
        }
    }

});

  client.on('messageReactionAdd', async (reaction, user, channel, message) => {
      if (user.bot) return;
      if(reaction.emoji.name === '📩') {
          const ticketConfig = await TicketConfig.findOne({ where:{ messageId: reaction.message.id}});
          if (ticketConfig) {
              const findTicket = await Ticket.findOne({ where: { authorId: user.id, resolved: false}});
          if (findTicket) user.send('Zaten Açık Bir Ticketin Var!');
          else{
              console.log('Ticket Oluşturuluyor.');
              try { 
                  const roleIDsString = ticketConfig.getDataValue('roles');
                  console.log(roleIDsString);
                  const roleIds = JSON.parse(roleIDsString);
                  const permissions = roleIds.map((id) => ({ allow: 'VIEW_CHANNEL', id}));
                  const channel = await reaction.message.guild.channels.create('ticket', {
                      parent: ticketConfig.getDataValue('parentID'),
                      permissionOverwrites: [
                          { deny: 'VIEW_CHANNEL', id: reaction.message.guild.id },
                          { allow: 'VIEW_CHANNEL', id: user.id },
                          ...permissions
                      ]
                  });
                  const msg = await channel.send('Lütfen Sorununuzu En Kısa Şekilde Açıklayınız. Personelimiz Size Geri Dönüş Sağlayacaktır. \n Ticketi Kapatmak İçin Aşağıdaki İfadeye Tıklayınız. ');
                  await msg.react('🔒');
                  msg.pin();

                  const ticket = await Ticket.create({
                      authorId: user.id,
                      channelId: channel.id,
                      guildId: reaction.message.guild.id,
                      resolved: false,
                      closedMessageID: msg.id
                    });

                    const ticketId = String(ticket.getDataValue('ticketId')).padStart(4, 0);
                    await channel.edit({ name: 'ticket-${ticketID}'})
              } catch (err) {
                  console.log(err);
                  client.users.cache.get(owner).send(err);
              }
              
          } 
          } else {
              console.log('Ticket Configi Bulunamadı!');
          }
      } else if (reaction.emoji.name === '🔒') {
          const ticket = await Ticket.findOne({ where: { channelId: reaction.message.channel.id}})
          if (ticket) {
              console.log(' Ticket Bulundu');
              const closedMessageID = ticket.getDataValue('closedMessageId');
              if (reaction.message.id === closedMessageID) {
                  reaction.message.channel.updateOverwrite(ticket.getDataValue('authorId'), {
                      VIEW_CHANNEL: false
                  }).catch((err) => console.log(err));
                  ticket.resolved = trute;
                  await ticket.save();
                  console.log('Güncellendi');
              }
          }
      };
  });
      
      client.login(process.env.BOT_TOKEN);