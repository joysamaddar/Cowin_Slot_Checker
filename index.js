const { Telegraf } = require('telegraf')
require('dotenv').config()
const fetch = require("node-fetch")

const token = process.env.BOT_TOKEN
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}

const bot = new Telegraf(token)

let slot_interval = null;

bot.start((ctx) => ctx.reply(`
Welcome to Cowin Slot Checker Bot!

/setup - Enter the setup command to start setup of the bot
`))

const getState = async ()=>{
    try{
        const response = await fetch("https://cdn-api.co-vin.in/api/v2/admin/location/states")
        let states_data = await response.json()
        states_data = states_data.states
        let states = states_data.map(state=>([
            {text: state.state_name, callback_data: state.state_id}
        ]))
        return [states, states_data];
    }catch(error){
        console.log(error)
    }
}

const getDistricts = async (state_no)=>{
    try{
        const response = await fetch(`https://cdn-api.co-vin.in/api/v2/admin/location/districts/${state_no}`)
        let district_data = await response.json()
        district_data = district_data.districts
        let districts = district_data.map(district=>([
            {text: district.district_name, callback_data: district.district_name}
        ]))
        let district_names = district_data.map(district=>(
            district.district_name
        ))
        return [districts, district_data, district_names];
    }catch(error){
        console.log(error)
    }
}

bot.command('setup', async (ctx) => {
    if(slot_interval){
        clearInterval(slot_interval);
    }
    const [states] = await getState();
    ctx.telegram.sendMessage(ctx.chat.id, "Please select your state:", {
        reply_markup: {
            inline_keyboard: states
        }
    })
})

bot.action(["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21",'22','23',"24","25","26","27","28","29","30","31","32",'33','34','35',"36",'37'], async (ctx)=>{
    if(slot_interval){
        clearInterval(slot_interval);
    }
    ctx.deleteMessage()
    let selected_state_no = ctx.match.input;
    let [states] = await getState();
    selected_state = states.filter(state=>{
        return state[0].callback_data==selected_state_no
    })
    selected_state = selected_state[0][0].text

    //Districts
    let [districts,district_data, district_names] = await getDistricts(selected_state_no);
    districts.push([{text: "GO BACK", callback_data: "goto_states"}]);
    ctx.telegram.sendMessage(ctx.chat.id, "Please select the district:", {
        reply_markup: {
            inline_keyboard: districts
        }
    })

    bot.action(district_names, async(districtCtx)=>{
        if(slot_interval){
            clearInterval(slot_interval);
        }
        let selected_district = district_data.filter(district => {
            return district.district_name==districtCtx.match.input
        })
        selected_district = selected_district[0];
        try{
            let response = await fetch(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${selected_district.district_id}&date=07-05-2021`)
                let slot_data = await response.json();
                slot_data = slot_data.centers;
                let available_centeres = slot_data.filter(center=>{
                    let sessions = center.sessions;
                    sessions = sessions.filter(session=>{
                        return (session.available_capacity>0 && session.min_age_limit==18)
                    })
                    return sessions.length>0
                })
                if(available_centeres.length>0){
                    available_centeres.map(center=>{
                        ctx.reply(`${center.name} has vaccines available!`);
                    })
                }else{
                    ctx.reply(`No center in ${selected_district.district_name} has vaccines available for 18+ at the moment.`);
                }
            slot_interval = setInterval(async function(){ 
                let response = await fetch(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${selected_district.district_id}&date=07-05-2021`)
                let slot_data = await response.json();
                slot_data = slot_data.centers;
                let available_centeres = slot_data.filter(center=>{
                    let sessions = center.sessions;
                    sessions = sessions.filter(session=>{
                        return (session.available_capacity>0 && session.min_age_limit==18)
                    })
                    return sessions.length>0
                })
                if(available_centeres.length>0){
                    available_centeres.map(center=>{
                        ctx.reply(`${center.name} has vaccines available!`);
                    })
                }else{
                    ctx.reply(`No center in ${selected_district.district_name} has vaccines available for 18+ at the moment.`);
                }
            }, 120000);
        }catch(error){
            console.log(error)
        }
    })
});


bot.action(("goto_states"), async (ctx)=>{
    ctx.deleteMessage()
    const [states] = await getState();
    ctx.telegram.sendMessage(ctx.chat.id, "Please select your state:", {
        reply_markup: {
            inline_keyboard: states
        }
    })
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
