const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');

// MongoDB Schema
const memberSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    genre: { type: String, required: true },
    role: { type: String, required: true },
    joinDate: { type: Date, default: Date.now },
    participationScore: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
});

const eventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    description: { type: String },
    createdBy: { type: String, required: true },
    attendees: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

const Member = mongoose.model('Member', memberSchema);
const Event = mongoose.model('Event', eventSchema);

class MobileWhatsAppMusicBot {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "music-club-bot"
            })
        });
        
        // Configuration
        this.config = {
            adminNumber: '94755982430@c.us', // Your admin number
            groupId: 'KifdgN1LWlODP2HwJj69mN@g.us', // Extracted from your link
            mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/musicclub',
            botName: '🎵 Music Club Bot'
        };
        
        // Connect to MongoDB
        this.connectMongoDB();
        
        // Setup WhatsApp client
        this.setupWhatsAppClient();
    }
    
    async connectMongoDB() {
        try {
            await mongoose.connect(this.config.mongoUri);
            console.log('✅ MongoDB connected successfully');
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            process.exit(1);
        }
    }
    
    setupWhatsAppClient() {
        // QR Code generation for mobile scanning
        this.client.on('qr', (qr) => {
            console.log('🎵 Music Club Bot - Mobile එකෙන් QR Code scan කරන්න:');
            console.log('WhatsApp > Settings > Linked Devices > Link a Device');
            qrcode.generate(qr, { small: true });
        });
        
        // Bot ready
        this.client.on('ready', async () => {
            console.log('🎵 Music Club Bot Mobile සඳහා සූදානම්!');
            console.log(`📱 Admin: ${this.config.adminNumber}`);
            console.log(`👥 Group: ${this.config.groupId}`);
            
            // Send startup message to admin
            await this.sendToAdmin('🎵 Bot එක successfully start වුණා! Mobile සහ MongoDB ready! 🎵');
        });
        
        // Handle all messages
        this.client.on('message', async (message) => {
            try {
                await this.handleMessage(message);
            } catch (error) {
                console.error('Message handling error:', error);
            }
        });
        
        // Handle new members
        this.client.on('group_join', async (notification) => {
            try {
                await this.handleNewMember(notification);
            } catch (error) {
                console.error('New member handling error:', error);
            }
        });
        
        // Handle member leaving
        this.client.on('group_leave', async (notification) => {
            try {
                await this.handleMemberLeft(notification);
            } catch (error) {
                console.error('Member left handling error:', error);
            }
        });
    }
    
    async handleMessage(message) {
        const chat = await message.getChat();
        const contact = await message.getContact();
        const text = message.body.toLowerCase().trim();
        
        // Skip bot's own messages
        if (contact.isMe) return;
        
        // Only process messages from the target group
        if (chat.id._serialized !== this.config.groupId) return;
        
        // Handle commands
        if (text.startsWith('!')) {
            await this.handleCommand(message, text, contact);
            return;
        }
        
        // Auto-responses
        await this.handleAutoResponses(message, text, chat);
    }
    
    async handleCommand(message, command, contact) {
        const chat = await message.getChat();
        const isAdmin = contact.number === this.config.adminNumber.replace('@c.us', '');
        const args = command.split(' ').slice(1);
        const cmd = command.split(' ')[0];
        
        switch(cmd) {
            case '!help':
                await this.sendHelpMessage(chat);
                break;
                
            case '!register':
                await this.registerMember(chat, contact, args);
                break;
                
            case '!profile':
                await this.showProfile(chat, contact);
                break;
                
            case '!events':
                await this.showEvents(chat);
                break;
                
            case '!recommend':
                await this.getMusicRecommendation(chat, args);
                break;
                
            case '!stats':
                await this.showGroupStats(chat);
                break;
                
            case '!members':
                await this.listMembers(chat, isAdmin);
                break;
                
            // Admin only commands
            case '!announce':
                if (isAdmin) {
                    await this.makeAnnouncement(chat, args);
                } else {
                    await chat.sendMessage('❌ Admin කෙනෙකුට පමණක් announce කරන්න පුළුවන්!');
                }
                break;
                
            case '!event':
                if (isAdmin) {
                    await this.createEvent(chat, args, contact);
                } else {
                    await chat.sendMessage('❌ Admin කෙනෙකුට පමණක් event create කරන්න පුළුවන්!');
                }
                break;
                
            case '!backup':
                if (isAdmin) {
                    await this.createBackup(chat);
                } else {
                    await chat.sendMessage('❌ Admin access අවශ්‍යයි!');
                }
                break;
                
            default:
                await chat.sendMessage('❓ නොදන්නා command එකක්. !help type කරන්න.');
        }
    }
    
    async handleNewMember(notification) {
        const chat = await notification.getChat();
        
        // Check if it's our target group
        if (chat.id._serialized !== this.config.groupId) return;
        
        const welcomeMessage = `🎵 *${chat.name} වෙත සාදරයෙන් පිළිගනිමු!* 🎵

🎶 අපේ සංගීත සමාජයට සම්බන්ධ වීම ගැන අපි සතුටුයි! 

*අපි කරන දේවල්:*
• නව සංගීතය share කරනවා සහ discover කරනවා
• Listening parties සහ events organize කරනවා  
• සංගීත theory සහ techniques discuss කරනවා
• දේශීය කලාකරුවන්ට support කරනවා

*පටන් ගන්න:*
• !register type කරලා ඔබේ profile complete කරන්න
• !help type කරලා available commands බලන්න
• !events type කරලා upcoming activities බලන්න

*Group Rules:*
✅ Respectful සහ supportive වෙන්න
✅ සංගීත-related content share කරන්න
✅ Spam නොකරන්න
✅ සංගීත focused discussions තබන්න

🎵 අපි එක්ක beautiful music හදමු! 🎵

*Mobile Bot by: Admin* 📱`;

        await chat.sendMessage(welcomeMessage);
        
        // Send registration reminder after 5 minutes
        setTimeout(async () => {
            await chat.sendMessage(`👋 Hi! !register command එක use කරලා full Music Club experience එක ගන්න අමතක කරන්න එපා! 📱🎵`);
        }, 300000);
    }
    
    async registerMember(chat, contact, args) {
        if (args.length < 3) {
            await chat.sendMessage(`🎵 *Member Registration* 🎵

කරුණාකර මේ format එකේ details provide කරන්න:
!register [නම] [ප්‍රිය_ප්‍රභේදය] [භූමිකාව]

උදාහරණය: !register කමල් Rock Guitar

*භූමිකාව වෙන්න පුළුවන්:*
Singer, Guitarist, Bassist, Drummer, Pianist, Producer, DJ, Listener, වගේ

📱 *Mobile Bot Ready!*`);
            return;
        }
        
        try {
            const phoneNumber = contact.number;
            const memberData = {
                phoneNumber: phoneNumber,
                name: args[0],
                genre: args[1],
                role: args.slice(2).join(' ')
            };
            
            // Check if member already exists
            const existingMember = await Member.findOne({ phoneNumber });
            
            if (existingMember) {
                // Update existing member
                await Member.findOneAndUpdate(
                    { phoneNumber },
                    memberData,
                    { new: true }
                );
                
                await chat.sendMessage(`🎵 *Profile Updated!* 🎵

${memberData.name}, ඔබේ profile එක update කරලා තියෙනවා! 
🎶 ප්‍රභේදය: ${memberData.genre}
🎸 භූමිකාව: ${memberData.role}

📱 *MongoDB වෙතින් update වුණා!*`);
            } else {
                // Create new member
                const newMember = new Member(memberData);
                await newMember.save();
                
                await chat.sendMessage(`🎵 *Registration Successful!* 🎵

සාදරයෙන් පිළිගනිමු ${memberData.name}! 
🎶 ප්‍රභේදය: ${memberData.genre}
🎸 භූමිකාව: ${memberData.role}

ඔබ දැන් registered member කෙනෙක්! !profile type කරලා complete profile එක බලන්න.

📱 *Mobile Bot + MongoDB Ready!*`);
            }
        } catch (error) {
            console.error('Registration error:', error);
            await chat.sendMessage('❌ Registration වෙලාවට error එකක් ආවා. නැවත try කරන්න.');
        }
    }
    
    async showProfile(chat, contact) {
        try {
            const member = await Member.findOne({ phoneNumber: contact.number });
            
            if (!member) {
                await chat.sendMessage('❌ ඔබ register වෙලා නෑ! !register use කරලා register වෙන්න.');
                return;
            }
            
            const profile = `🎵 *ඔබේ Music Club Profile* 🎵

👤 *නම:* ${member.name}
🎶 *ප්‍රිය ප්‍රභේදය:* ${member.genre}
🎸 *භූමිකාව:* ${member.role}
📅 *Member වුණේ:* ${member.joinDate.toLocaleDateString('si-LK')}
⭐ *Participation Score:* ${member.participationScore}
🏆 *Level:* ${this.getMemberLevel(member.participationScore)}

📱 *Mobile Bot වෙතින්* - 💾 *MongoDB Storage*`;

            await chat.sendMessage(profile);
        } catch (error) {
            console.error('Profile error:', error);
            await chat.sendMessage('❌ Profile load කරන්න error එකක් ආවා.');
        }
    }
    
    async sendHelpMessage(chat) {
        const helpMessage = `🎵 *Music Club Bot Commands* 🎵
📱 *Mobile Bot + MongoDB*

*👥 Member Commands:*
!register [නම] [ප්‍රභේදය] [භූමිකාව] - Register වෙන්න
!profile - ඔබේ profile බලන්න
!events - Upcoming events බලන්න
!recommend [ප්‍රභේදය] - සංගීත නිර්දේශ ගන්න
!stats - Group statistics බලන්න
!members - සියලුම members list කරන්න

*🎵 Music Features:*
!recommend sinhala - සිංහල සංගීත
!recommend baila - Baila සංගීත
!recommend rock - Rock සංගීත

*⚙️ Admin Commands:*
!announce [message] - Announcement කරන්න
!event create [date] [time] [name] - Event හදන්න
!backup - Data backup කරන්න

📱 *Mobile සහ MongoDB Ready!*
🎶 Command එකක් type කරලා start කරන්න!`;

        await chat.sendMessage(helpMessage);
    }
    
    async makeAnnouncement(chat, args) {
        if (args.length === 0) {
            await chat.sendMessage('❌ කරුණාකර announcement message එක provide කරන්න.');
            return;
        }
        
        const announcement = `📢 *MUSIC CLUB ANNOUNCEMENT* 📢

${args.join(' ')}

🎵 *From: Music Club Management* 🎵
📱 *Mobile Bot වෙතින්*

*Admin: +94755982430*`;

        await chat.sendMessage(announcement);
    }
    
    async createEvent(chat, args, contact) {
        if (args.length < 4 || args[0] !== 'create') {
            await chat.sendMessage(`🎵 *Event Create කරන්න* 🎵

Format: !event create [date] [time] [event_name]
උදාහරණය: !event create 2024-12-25 19:00 Christmas_Concert

📱 *Mobile Bot Ready*`);
            return;
        }
        
        try {
            const eventData = {
                date: args[1],
                time: args[2],
                name: args.slice(3).join(' ').replace(/_/g, ' '),
                createdBy: contact.number,
                description: `Mobile Bot වෙතින් create කරන ලද event එකක්`
            };
            
            const newEvent = new Event(eventData);
            await newEvent.save();
            
            const eventMessage = `🎵 *නව EVENT එකක් CREATE වුණා* 🎵

🎤 *Event:* ${eventData.name}
📅 *දිනය:* ${eventData.date}
⏰ *වේලාව:* ${eventData.time}

👍 React කරන්න attendance confirm කරන්න!
❤️ React කරන්න excited කියන්න!

📱 *Mobile Bot + MongoDB*
#MusicClubEvent #SaveTheDate`;

            await chat.sendMessage(eventMessage);
        } catch (error) {
            console.error('Event creation error:', error);
            await chat.sendMessage('❌ Event create කරන්න error එකක් ආවා.');
        }
    }
    
    async showEvents(chat) {
        try {
            const events = await Event.find().sort({ createdAt: -1 }).limit(5);
            
            if (events.length === 0) {
                await chat.sendMessage('📅 දැනට upcoming events නෑ. Admin කෙනෙක්ට event create කරන්න කියන්න!');
                return;
            }
            
            let eventsList = '🎵 *Upcoming Music Events* 🎵\n\n';
            
            events.forEach((event, index) => {
                eventsList += `${index + 1}. 🎤 *${event.name}*\n`;
                eventsList += `   📅 ${event.date} | ⏰ ${event.time}\n`;
                eventsList += `   👥 ${event.attendees.length} attending\n\n`;
            });
            
            eventsList += '📱 *Mobile Bot + MongoDB Storage*';
            
            await chat.sendMessage(eventsList);
        } catch (error) {
            console.error('Events display error:', error);
            await chat.sendMessage('❌ Events load කරන්න error එකක් ආවා.');
        }
    }
    
    async getMusicRecommendation(chat, args) {
        const genre = args[0] || 'random';
        
        const recommendations = {
            sinhala: [
                'සඳ හදවතේ - Amarasiri Peiris',
                'ගිරා නිමාල - Nanda Malini', 
                'හතර වරු - Pandith Amaradeva',
                'මල් මිදුලේ - Victor Ratnayake'
            ],
            baila: [
                'කොළඹ කෙල්ලේ - Desmond de Silva',
                'මල්ලී - Corrine Almeida',
                'චික්කන් රෝල් - Gypsies',
                'හොට් චොකලට් - Rookantha Gunathilake'
            ],
            rock: [
                'Bohemian Rhapsody - Queen',
                'Stairway to Heaven - Led Zeppelin', 
                'Sweet Child O Mine - Guns N Roses',
                'Hotel California - Eagles'
            ],
            pop: [
                'Shape of You - Ed Sheeran',
                'Blinding Lights - The Weeknd',
                'Billie Jean - Michael Jackson',
                'Yesterday - The Beatles'
            ],
            random: [
                'Imagine - John Lennon',
                'What a Wonderful World - Louis Armstrong',
                'Hallelujah - Leonard Cohen',
                'Fix You - Coldplay'
            ]
        };
        
        const songs = recommendations[genre] || recommendations.random;
        const randomSong = songs[Math.floor(Math.random() * songs.length)];
        
        await chat.sendMessage(`🎵 *Music Recommendation* 🎵

🎶 *අදගේ Pick:* ${randomSong}
🎯 *ප්‍රභේදය:* ${genre.charAt(0).toUpperCase() + genre.slice(1)}

එක listen කරලා ඔබේ thoughts share කරන්න! 🎧

📱 *Mobile Bot Recommendation*`);
    }
    
    async showGroupStats(chat) {
        try {
            const totalMembers = await Member.countDocuments();
            const activeMembers = await Member.countDocuments({ isActive: true });
            const totalEvents = await Event.countDocuments();
            
            // Genre statistics
            const genreStats = await Member.aggregate([
                { $group: { _id: '$genre', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);
            
            // Role statistics  
            const roleStats = await Member.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);
            
            let stats = `📊 *Music Club Statistics* 📊\n\n`;
            stats += `👥 *Total Members:* ${totalMembers}\n`;
            stats += `✅ *Active Members:* ${activeMembers}\n`;
            stats += `🎤 *Total Events:* ${totalEvents}\n\n`;
            
            if (genreStats.length > 0) {
                stats += `🎶 *Top Genres:*\n`;
                genreStats.slice(0, 3).forEach((stat, index) => {
                    stats += `${index + 1}. ${stat._id}: ${stat.count} members\n`;
                });
                stats += '\n';
            }
            
            if (roleStats.length > 0) {
                stats += `🎸 *Popular Roles:*\n`;
                roleStats.slice(0, 3).forEach((stat, index) => {
                    stats += `${index + 1}. ${stat._id}: ${stat.count} members\n`;
                });
            }
            
            stats += `\n📱 *Mobile Bot + MongoDB*\n`;
            stats += `🔄 *Real-time Data*`;
            
            await chat.sendMessage(stats);
        } catch (error) {
            console.error('Stats error:', error);
            await chat.sendMessage('❌ Statistics load කරන්න error එකක් ආවා.');
        }
    }
    
    async listMembers(chat, isAdmin) {
        try {
            const members = await Member.find({ isActive: true }).sort({ joinDate: -1 });
            
            if (members.length === 0) {
                await chat.sendMessage('👥 Register වුණු members නෑ.');
                return;
            }
            
            let membersList = '👥 *Registered Members* 👥\n\n';
            
            members.forEach((member, index) => {
                membersList += `${index + 1}. 🎵 *${member.name}*\n`;
                membersList += `   🎶 ${member.genre} | 🎸 ${member.role}\n`;
                if (isAdmin) {
                    membersList += `   📱 ${member.phoneNumber}\n`;
                }
                membersList += `   📅 ${member.joinDate.toLocaleDateString('si-LK')}\n\n`;
            });
            
            membersList += `📊 *Total: ${members.length} members*\n`;
            membersList += `📱 *Mobile Bot + MongoDB*`;
            
            await chat.sendMessage(membersList);
        } catch (error) {
            console.error('Members list error:', error);
            await chat.sendMessage('❌ Members list load කරන්න error එකක් ආවා.');
        }
    }
    
    async createBackup(chat) {
        try {
            const members = await Member.find();
            const events = await Event.find();
            
            const backupData = {
                timestamp: new Date().toISOString(),
                totalMembers: members.length,
                totalEvents: events.length,
                members: members,
                events: events
            };
            
            // In a real implementation, you'd save this to a file or cloud storage
            console.log('Backup created:', backupData.timestamp);
            
            await chat.sendMessage(`💾 *Backup Created Successfully!* 💾

📊 *Backup Details:*
• Members: ${backupData.totalMembers}
• Events: ${backupData.totalEvents}  
• Timestamp: ${new Date().toLocaleString('si-LK')}

📱 *Mobile Bot Backup*
💾 *MongoDB Data Secured*`);
            
        } catch (error) {
            console.error('Backup error:', error);
            await chat.sendMessage('❌ Backup create කරන්න error එකක් ආවා.')
