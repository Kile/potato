const potato_slash = discord.interactions.commands.registerGroup({
  name: 'potato',
  description: 'Potato commands'
});

const ALLOW_DAILY = true;
const SHOP_ITEMS = {
  'potato farmer': {
    price: 1,
    description: 'gives you the potato farmer role for 24h',
    async onPurchase(user: discord.User) {
      const guild = await discord.getGuild();
      const member = await guild.getMember(user.id);
      const role = await guild
        .getRoles()
        .then((roles) => roles.find((role) => role.name === 'potato farmer'));
      if (!member || !role) throw new Error('invalid role or member');
      await member.addRole(role.id);
    },
    async onExpire(user: discord.User) {
      const guild = await discord.getGuild();
      const member = await guild.getMember(user.id);
      const role = await guild
        .getRoles()
        .then((roles) => roles.find((role) => role.name === 'potato farmer'));
      if (!member || !role || !member.roles.includes(role.id)) return;

      await member.removeRole(role.id);
    },
    enabled: true,
    duration: 24 * 60 * 60 * 1000 // 24 hours, checked in 5 minute intervals
  }
} as {
  [key: string]: {
    price: number;
    duration: number | undefined;
    description: string;
    enabled: boolean;
    onPurchase: Function;
    onExpire: Function;
  };
};
const MEDALS = [
  discord.decor.Emojis.FIRST_PLACE_MEDAL,
  discord.decor.Emojis.SECOND_PLACE_MEDAL,
  discord.decor.Emojis.THIRD_PLACE_MEDAL
];

const potatoKV = new pylon.KVNamespace('potato');
const randomTimeBetween = (min: number, max: number) =>
  Math.round(Math.random() * (max - min) + min);

discord.on(discord.Event.MESSAGE_CREATE, async (message: discord.Message) => {
  if (!message.author || message.author.bot) return;

  if (await potatoKV.get<boolean>('cooldown')) {
    if (message.content === discord.decor.Emojis.POTATO) {
      const [lastChannel, potatoId] =
        (await potatoKV.get<string>('lastPotato'))?.split('-') || [];
      if (lastChannel !== message.channelId) return;

      try {
        await message
          .getChannel()
          .then((c) => c.getMessage(potatoId))
          .then((m) => m?.delete())
          .catch(() => {});

        await message.delete().catch(() => {});
      } catch (nothing) {}

      const poisonous = Math.random() < 0.01;

      const oldCount = (await potatoKV.get<number>(message.author.id)) || 0;
      const newCount = Math.max(
        0,
        oldCount +
          (poisonous
            ? -Math.max(
                1,
                Math.min(10, Math.floor((Math.random() * oldCount) / 4))
              )
            : 1)
      );

      await potatoKV.put(message.author.id, newCount);
      await potatoKV.delete('lastPotato');
      await message.reply(
        new discord.Embed({
          title: `${
            poisonous ? discord.decor.Emojis.SKULL : discord.decor.Emojis.POTATO
          } potato claimed ${discord.decor.Emojis.POTATO}`,
          description: `${message.author.getTag()} ${
            poisonous
              ? `tried to pick up a poisonous potato, poisoning ${oldCount -
                  newCount} potatos in the process`
              : 'has claimed a potato'
          }, and now holds onto ${newCount} potato${
            newCount === 1 ? '' : 'es'
          }.`,
          color: 0x11111c,
          thumbnail: { url: message.author.getAvatarUrl() },
          footer: {
            text: poisonous
              ? ''
              : "to the rest of you, can't catch em all, right?"
          }
        })
      );
    }

    return;
  } else {
    const [lastChannel, potatoId] =
      (await potatoKV.get<string>('lastPotato'))?.split('-') || [];

    await discord
      .getGuild()
      .then(
        (g) =>
          g.getChannel(lastChannel) as Promise<
            discord.GuildTextChannel | undefined
          >
      )
      .then((c) => c?.getMessage(potatoId))
      .then((m) => m?.delete())
      .catch(() => {});
  }

  if (Math.random() > 0.3) return;

  const reply = await message.reply(discord.decor.Emojis.POTATO);

  const cooldown = randomTimeBetween(3 * 60 * 1000, 20 * 60 * 1000);

  await potatoKV.put('cooldown', true, { ttl: cooldown });
  await potatoKV.put('lastPotato', `${message.channelId}-${reply.id}`);
});

potato_slash.register(
  {
    name: 'help',
    description: 'Displays usable potato commands'
  },
  async (message) => {
    await message.respondEphemeral(`${discord.decor.Emojis.POTATO} help ${discord.decor.Emojis.POTATO}
        
when a ${discord.decor.Emojis.POTATO} is dropped, be the first to pick it up by posting a ${discord.decor.Emojis.POTATO} too.
            
**commands**:
- \`/potato help\` - shows this help message
- \`/potato inspect [user]\` - inspect another [user]s potato balance or your own
- \`/potato top [count]\` - top n potato collectors
- \`/potato gamble <count>\` - gamble <count> potatoes
- \`/potato steal <who> <count>\` - steal potatoes from other people
- \`/potato give <who> <count>\` - give your potatoes to other people - if you're feeling kind.
- \`/potato drop\` - drop one of your potatoes. the fastest to pick it up gets it
- \`/potato daily\` - claim your daily potato

- \`/potato shop list\` - list all available shop items
- \`/potato shop buy <item>\` - buy <item> from the shop
`);
  }
);

potato_slash.register(
  {
    name: 'inspect',
    description: 'inspect how many potatoes someone has',
    options: (opt) => ({
      who: opt.guildMember({
        name: 'who',
        description: "who's potatoes to inspect",
        required: false
      })
    })
  },
  async (message, { who }) => {
    var user: discord.User;
    if (who) {
      user = who.user;
    } else {
      user = message.member.user;
    }
    //Had to add that as default subcommands are not possible => No /potato
    const currentCount = (await potatoKV.get<number>(user.id)) || 0;
    await message.respond(
      `${discord.decor.Emojis.POTATO} potato count ${
        discord.decor.Emojis.POTATO
      }

${user.getTag()} has ${currentCount} potato${
        currentCount === 1 ? '' : 'es'
      }. ${discord.decor.Emojis.POTATO.repeat(Math.min(currentCount, 100))}`
    );
  }
);

potato_slash.register(
  {
    name: 'gamble',
    description: 'gamble with your potatoes',
    options: (opt) => ({
      amount: opt.integer({
        name: 'amount',
        description: 'how many potatoes you want to gamble',
        required: true
      })
    })
  },
  async (message, { amount }) => {
    if (await potatoKV.get<boolean>(`gamble-${message.member?.user.id}`))
      return await message.respond(
        `${discord.decor.Emojis.NO_ENTRY_SIGN} ${discord.decor.Emojis.POTATO} gambling addiction is a serious problem. Regulations require a wait.`
      );

    const currentCount =
      (await potatoKV.get<number>(message.member?.user.id)) || 0;

    if (amount > currentCount)
      return await message.respond(
        'You can only gamble as many potatoes as you have!'
      );

    if (amount > 10 || amount < 1)
      return await message.respond(
        'You can only gamble between 1 and 10 potatoes.'
      );

    await potatoKV.put(`gamble-${message.member?.user.id}`, true, {
      ttl: randomTimeBetween(2 * 60 * 1000, 5 * 60 * 1000)
    });

    const won = Math.random() > 0.5;
    const newCount = currentCount + amount * (won ? 1 : -1);
    await potatoKV.put(message.member?.user.id, newCount);

    await message.respond(`${discord.decor.Emojis.GAME_DIE} ${
      discord.decor.Emojis.POTATO
    } ${discord.decor.Emojis.GAME_DIE}
      
Your gambling ${won ? 'paid off' : 'sucked'}, you ${
      won ? 'won' : 'lost'
    } ${amount} potato${amount === 1 ? '' : 'es'}, ${
      won ? 'giving you' : 'leaving you with'
    } a total of ${newCount} potato${
      newCount === 1 ? '' : 'es'
    }. ${discord.decor.Emojis.POTATO.repeat(newCount)} ${
      won
        ? discord.decor.Emojis.CHART_WITH_UPWARDS_TREND
        : discord.decor.Emojis.CHART_WITH_DOWNWARDS_TREND
    }`);
  }
);
potato_slash.register(
  {
    name: 'steal',
    description: 'Steal potatoes from a fellow collector',
    options: (opt) => ({
      who: opt.guildMember({
        name: 'who',
        description: 'who to steal from',
        required: true
      }),
      count: opt.integer({
        name: 'amount',
        description: ' How much you want to steal'
      })
    })
  },
  async (message, { who, count }) => {
    if (message.member?.user.id === who.user.id)
      return await message.respond("You can't steal from yourself!");
    if (await potatoKV.get<boolean>(`steal-${message.member?.user.id}`))
      return await message.respond(
        `${discord.decor.Emojis.POLICE_OFFICER} Your potato thief actions are being currently scrutinized. Lay low for a while.`
      );
    const success = Math.random() < 0.25;
    const userPotatos =
      (await potatoKV.get<number>(message.member?.user.id)) || 0;
    const targetPotatos = (await potatoKV.get<number>(who.user.id)) || 0;

    if (count > userPotatos)
      return await message.respond(
        'You can only steal as many potatoes as you have!'
      );

    if (count > targetPotatos)
      return await message.respond('That user doesnt have that many potatoes!');

    if (count < 1)
      return await message.respond('You need to steal at least one potato.');

    if (count > 5)
      return await message.respond(
        'Your small hands can only carry 5 potatos!'
      );

    await potatoKV.put(`steal-${message.member?.user.id}`, true, {
      ttl: randomTimeBetween(3 * 60 * 1000, 10 * 60 * 1000)
    });

    const newUserPotatos = userPotatos + count * (success ? 1 : -1);
    const newTargetPotatos = targetPotatos + count * (success ? -1 : 1);

    await potatoKV.put(message.member?.user.id, newUserPotatos);
    await potatoKV.put(who.user.id, newTargetPotatos);

    await message.respond(`${discord.decor.Emojis.GLOVES} ${
      discord.decor.Emojis.POTATO
    } ${discord.decor.Emojis.GLOVES}
Your thievery ${success ? 'paid off' : 'sucked'}, you ${
      success ? 'stole' : 'gave'
    } ${count} potato${count === 1 ? '' : 'es'} ${
      success ? 'from' : 'to'
    } ${who.user.getTag()}, ${
      success ? 'giving you a total of' : 'leaving you with'
    } ${newUserPotatos} potato${
      newUserPotatos === 1 ? '' : 'es'
    }. ${discord.decor.Emojis.POTATO.repeat(newUserPotatos)} ${
      success
        ? discord.decor.Emojis.CHART_WITH_UPWARDS_TREND
        : discord.decor.Emojis.CHART_WITH_DOWNWARDS_TREND
    }`);
  }
);

potato_slash.register(
  {
    name: 'give',
    description: 'Give potatoes to a fellow collector',
    options: (opt) => ({
      who: opt.guildMember({
        name: 'who',
        description: 'who to bless with more potatoes',
        required: true
      }),
      count: opt.integer({
        name: 'amount',
        description: ' How much you want to give'
      })
    })
  },
  async (message, { who, count }) => {
    if (message.member?.user.id === who.user.id)
      return await message.respond("You can't give potatos to yourself!");
    if (who.user.bot)
      return await message.respond("You can't give potatos to bots!");
    const userPotatos =
      (await potatoKV.get<number>(message.member?.user.id)) || 0;
    const targetPotatos = (await potatoKV.get<number>(who.user.id)) || 0;

    if (!count && count !== 0) count = 1;

    if (count > userPotatos)
      return await message.respond(
        'You can only give as many potatos as you have!'
      );

    if (count < 1)
      return await message.respond('You need to send at least one potato.');

    const newUserPotatos = userPotatos - count;
    const newTargetPotatos = targetPotatos + count;

    await potatoKV.put(message.member?.user.id, newUserPotatos);
    await potatoKV.put(who.user.id, newTargetPotatos);

    await message.respond(
      `You gave ${count} potato${
        count === 1 ? '' : 'es'
      } to ${who.user.getTag()}, how nice of you.`
    );
  }
);

potato_slash.register(
  {
    name: 'top',
    description: 'View the top potato collector',
    options: (opt) => ({
      count: opt.integer({
        name: 'count',
        description: 'top x collectors',
        required: false
      })
    })
  },
  async (message, { count }) => {
    count = Math.min(Math.max(3, count || 10), 20);
    const items = await potatoKV.items();
    const filtered = items.filter(
      (entry) =>
        !isNaN((entry.key as unknown) as number) &&
        ((entry.value as unknown) as number) > 0
    );
    const sorted = filtered.sort(
      (a, b) => (b.value as number) - (a.value as number)
    );
    const top = sorted.slice(0, count);
    count = top.length;
    const userMap = await Promise.all(
      top.map((entry) =>
        discord
          .getUser(entry.key)
          .then((user) => ({ user, potatos: entry.value as number }))
      )
    );

    let description = `${discord.decor.Emojis.POTATO} **${filtered
      .reduce((a, b) => a + (b.value as number), 0)
      .toLocaleString()}**\n`;
    description += `${discord.decor.Emojis.MAN_FARMER} **${filtered.length}**\n\n`;
    description += `${discord.decor.Emojis.CHART_WITH_UPWARDS_TREND} **Ranks** ${discord.decor.Emojis.MUSCLE}\n`;

    for (const entry of userMap.slice(0, Math.max(3, count - 1))) {
      const { user, potatos } = entry;
      const place = userMap.indexOf(entry);
      description += `\` ${MEDALS[place] ||
        `${(place + 1).toString().padStart(2, ' ')} `} \` **${
        user?.username
      }**#${user?.discriminator} - ${potatos.toLocaleString()} potatos\n`;
    }

    const ownIndex = sorted.findIndex(
      (item) => item.key === message.member.user.id
    );

    if (ownIndex >= count) {
      description += `\` ... \` *${ownIndex - count + 1}* other farmers\n`;
      description += `\` ${(ownIndex + 1).toString().padStart(2, ' ')} \` **${
        message.member.user.username
      }**#${message.member.user.discriminator} - ${
        sorted[ownIndex].value
      } potato${sorted[ownIndex].value === 1 ? '' : 'es'}`;
    } else if (count > 3) {
      const { user, potatos } = userMap[count - 1];
      description += `\` ${count.toString().padStart(2, ' ')}  \` **${
        user?.username
      }**#${user?.discriminator} - ${potatos.toLocaleString()} potatos\n`;
    }

    await message.respond(`${discord.decor.Emojis.TROPHY} Leaderboard​ ${discord.decor.Emojis.CROWN}
    
${description}`);
  }
);

potato_slash.register(
  { name: 'drop', description: 'drop a potato in the chat' },
  async (message) => {
    const userPotatos =
      (await potatoKV.get<number>(message.member?.user.id)) || 0;

    if (!userPotatos)
      return await message.respond("you don't have any potatos!");

    const lastPotato = await potatoKV.get<string>('lastPotato');
    if (lastPotato)
      return await message.respond(
        `there is already an active potato waiting to be picked up in <#${
          lastPotato.split('-')[0]
        }>!`
      );

    await potatoKV.put(message.member?.user.id, userPotatos - 1);

    const reply = await message.respond(discord.decor.Emojis.POTATO);

    const cooldown = randomTimeBetween(3 * 60 * 1000, 20 * 60 * 1000);

    await potatoKV.put('cooldown', true, { ttl: cooldown });
    await potatoKV.put(
      'lastPotato',
      `${message.channelId}-No id because slash command...`,
      {
        ttl: cooldown
      }
    );
  }
);

potato_slash.register(
  {
    name: 'modify',
    description: 'Modify the potatoes of a fellow collector',
    showSourceMessage: false,
    options: (opt) => ({
      who: opt.guildMember({
        name: 'who',
        description: "who's potatoes to modify",
        required: true
      }),
      count: opt.string({
        name: 'amount',
        description: ' How much you want to give/take'
      })
    })
  },
  async (message, { who, count }) => {
    if (!message.member.can(discord.Permissions.ADMINISTRATOR))
      return await message.respondEphemeral('missing permissions');
    if (who.user.bot)
      return await message.respondEphemeral(
        'thats a.. bot. you wanna modify a bots potatos??'
      );
    const oldCount = (await potatoKV.get<number>(who.user.id)) || 0;

    let newCount = oldCount;
    if (count.startsWith('+')) newCount += parseInt(count.replace('+', ''));
    else if (count.startsWith('-'))
      newCount -= parseInt(count.replace('-', ''));
    else newCount = parseInt(count);

    if (isNaN(newCount as number))
      return await message.respond('invalid count');

    await potatoKV.put(who.user.id, newCount as number);
    await message.respondEphemeral(
      `Ok, updated ${who.user.getTag()}'s potatoes to ${newCount}`
    );
  }
);

if (ALLOW_DAILY)
  potato_slash.register(
    {
      name: 'daily',
      description: 'Get your daily potato!'
    },
    async (message) => {
      if (await potatoKV.get<boolean>(`daily-${message.member.user.id}`))
        return await message.respond('you already claimed your daily potato!');

      await potatoKV.put(`daily-${message.member.user.id}`, true, {
        ttl:
          Math.ceil(Date.now() / 1000 / 60 / 60 / 24) * 24 * 60 * 60 * 1000 -
          Date.now()
      });
      const newCount = await potatoKV.transact(
        message.member.user.id,
        (prev: number | undefined) => (prev || 0) + 1
      );
      await message.respond(
        `you claimed your daily potato, and now hold onto ${newCount} potatos.`
      );
    }
  );

const shop = potato_slash.registerGroup({
  name: 'shop',
  description: 'Buy stuff with potatoes in the potato shop'
});

shop.register(
  { name: 'list', description: 'list all potato shop items' },
  async (message) => {
    if (!Object.keys(SHOP_ITEMS).length)
      return await message.respond('no items currently available, sorry!');

    const fields = await Promise.all(
      Object.entries(SHOP_ITEMS)
        .filter(([, item]) => item.enabled)
        .map(async ([name, item]) => ({
          name: `${name} - ${item.price} ${discord.decor.Emojis.POTATO}`,
          value: item.description,
          inline: true
        }))
    );

    let embed = new discord.Embed({
      title: 'Potato Shop',
      description:
        '**Available Items**\nuse `/potato shop buy <item>` to purchase an item listed here',
      fields: fields
    });

    await message.respond({ embeds: [embed] });
  }
);

shop.register(
  {
    name: 'buy',
    description: 'purchase a potato shop item',
    options: (opt) => ({
      item: opt.string({
        name: 'item',
        description: 'What item to buy',
        required: true
      })
    })
  },
  async (message, { item }) => {
    const itemObj = SHOP_ITEMS[item];
    if (!itemObj || !itemObj.enabled)
      return await message.respond(
        `invalid potato item. use \`/potato shop list\` to get a list of all available items`
      );

    const purchases = ((await potatoKV.get<pylon.JsonArray>('shop')) || []) as {
      user: string;
      item: string;
      expiresAt: number | undefined;
    }[];
    const purchase = purchases.find(
      (purchase) =>
        purchase.user === message.member.user.id && purchase.item === item
    );
    if (purchase)
      return message.respond(
        `You already bought this item!${
          purchase.expiresAt
            ? ` You can buy it again on ${new Date(
                purchase.expiresAt
              ).toUTCString()}`
            : ''
        }`
      );

    const userPotatos =
      (await potatoKV.get<number>(message.member.user.id)) || 0;
    if (userPotatos < itemObj.price)
      return await message.respond(
        "you don't have enough potatos for that item!"
      );

    try {
      await itemObj.onPurchase(message.member.user);
    } catch (err) {
      return await message.respond(
        `There was an error processing your order: ${err.message}`
      );
    }

    await potatoKV.transact(
      message.member.user.id,
      (prev: number | undefined) => (prev || 0) - itemObj.price
    );

    await potatoKV.transact(
      'shop',
      (prev: pylon.JsonArray | undefined) =>
        [
          ...(prev || []),
          {
            user: message.member.user.id,
            item,
            expiresAt: itemObj.duration
              ? Date.now() + itemObj.duration
              : undefined
          }
        ] as pylon.JsonArray
    );

    await message.respond(`You successfully bought \`${item}\`!`);
  }
);

pylon.tasks.cron('shop', '0 0/5 * * * * *', async () => {
  const purchases = ((await potatoKV.get<pylon.JsonArray>('shop')) || []) as {
    user: string;
    item: string;
    expiresAt: number | undefined;
  }[];

  const newPurchases = [];

  for (const purchase of purchases) {
    if (purchase.expiresAt && purchase.expiresAt <= Date.now()) {
      const item = SHOP_ITEMS[purchase.item];
      if (!item) continue;

      discord
        .getUser(purchase.user)
        .then((user) => item.onExpire(user))
        .catch((err) => console.error(err));
    } else newPurchases.push(purchase);
  }

  await potatoKV.put('shop', newPurchases as pylon.JsonArray);
});
