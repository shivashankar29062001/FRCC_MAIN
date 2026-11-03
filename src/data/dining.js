// ---------------------------------------------------------------------------
// /src/data/dining.js — Dining venues and menus data
// All prices and menu items are SAMPLE placeholders for demonstration.
// ---------------------------------------------------------------------------

export const samplePrices = true;

export const venues = [
  {
    id: 'restaurant',
    name: 'Restaurant',
    type: 'Restaurant',
    tagline: 'All-day multi-cuisine dining with authentic Andhra and continental favourites',
    cuisine: 'Multi-cuisine & Andhra',
    hours: '11:00 AM – 11:00 PM',
    minAge: 0,
    menu: [
      {
        category: 'Starters',
        items: [
          // SAMPLE items and prices
          { name: 'Paneer 65', description: 'Crisp cottage cheese tossed with curry leaves, crushed pepper and green chillies', price: 290, veg: true },
          { name: 'Andhra Royyala Vepudu', description: 'Spiced prawn fry tempered with coastal spices and shallots', price: 460, veg: false },
          { name: 'Guntur Kodi Vepudu', description: 'Tender chicken morsels sauteed in red chilli paste and spices', price: 380, veg: false },
          { name: 'Crispy Corn & Waterchestnut', description: 'Fried corn and water chestnuts tossed with peppers and scallions', price: 270, veg: true },
          { name: 'Mutton Sukka', description: 'Slow-roasted boneless mutton with dry coastal aromatics', price: 470, veg: false },
        ],
      },
      {
        category: 'Mains',
        items: [
          // SAMPLE items and prices
          { name: 'Paneer Butter Masala', description: 'Cottage cheese simmered in a mildly spiced tomato cream gravy', price: 360, veg: true },
          { name: 'Andhra Chicken Curry', description: 'Traditional country style chicken cooked in a rich onion and poppy seed gravy', price: 440, veg: false },
          { name: 'Gongura Mamsam', description: 'Mutton cooked with tangy sorrel leaves and freshly pounded spices', price: 540, veg: false },
          { name: 'Dal Tadka', description: 'Yellow lentils tempered with cumin, garlic and dried red chillies', price: 320, veg: true },
          { name: 'Fish Pulusu', description: 'River catch simmered in a tangy tamarind and shallot sauce', price: 510, veg: false },
          { name: 'Subz Nizami Handi', description: 'Seasonal vegetables cooked in a cashewnut and spinach gravy', price: 350, veg: true },
        ],
      },
      {
        category: 'Breads & Rice',
        items: [
          // SAMPLE items and prices
          { name: 'Butter Naan', description: 'Traditional tandoori flatbread brushed with butter', price: 80, veg: true },
          { name: 'Roti Basket', description: 'Assortment of tandoori roti, naan and kulcha', price: 210, veg: true },
          { name: 'Hyd Chicken Dum Biryani', description: 'Fragrant basmati rice slow-cooked with spiced chicken pieces', price: 260, veg: false },
          { name: 'Steamed Basmati Rice', description: 'Long-grain aged basmati rice', price: 110, veg: true },
          { name: 'Curd Rice', description: 'Tempered seasoned yogurt rice with mustard seeds and curry leaves', price: 140, veg: true },
        ],
      },
      {
        category: 'Desserts',
        items: [
          // SAMPLE items and prices
          { name: 'Gulab Jamun with Rabdi', description: 'Warm milk dumplings soaked in cardamom syrup with thickened milk', price: 210, veg: true },
          { name: 'Double Ka Meetha', description: 'Traditional Hyderabad fried bread pudding with saffron and nuts', price: 230, veg: true },
          { name: 'Warm Chocolate Brownie', description: 'Rich chocolate walnut brownie served warm', price: 250, veg: true },
          { name: 'Choice of Ice Cream', description: 'Two scoops of vanilla, strawberry or butterscotch', price: 180, veg: true },
        ],
      },
      {
        category: 'Beverages',
        items: [
          // SAMPLE items and prices
          { name: 'Fresh Lime Soda', description: 'Sparkling lime water with choice of sweet or salted flavour', price: 110, veg: null },
          { name: 'Sweet Lassi', description: 'Churned sweet curd flavoured with crushed cardamom', price: 140, veg: null },
          { name: 'Buttermilk', description: 'Light spiced buttermilk tempered with ginger and coriander', price: 90, veg: null },
          { name: 'Mineral Water', description: 'Bottled drinking water 1000 ml', price: 80, veg: null },
        ],
      },
    ],
  },
  {
    id: 'coffee-shop',
    name: 'Coffee Shop',
    type: 'Coffee Shop',
    tagline: 'Artisan brews, steeped teas and fresh bakes in a relaxed café setting',
    cuisine: 'Coffee & Bakes',
    hours: '6:30 AM – 10:30 PM',
    minAge: 0,
    menu: [
      {
        category: 'Hot Coffees',
        items: [
          // SAMPLE items and prices
          { name: 'Filter Coffee', description: 'Traditional South Indian chicory blend decoction with frothy milk', price: 120, veg: null },
          { name: 'Espresso', description: 'Single shot of rich dark roast Arabica extraction', price: 140, veg: null },
          { name: 'Cappuccino', description: 'Espresso topped with steamed milk and dense micro-foam', price: 190, veg: null },
          { name: 'Caffè Latte', description: 'Smooth espresso with velvety steamed milk', price: 210, veg: null },
          { name: 'Mocha', description: 'Espresso blended with dark chocolate and warm milk', price: 240, veg: null },
        ],
      },
      {
        category: 'Cold Coffees',
        items: [
          // SAMPLE items and prices
          { name: 'Classic Iced Coffee', description: 'Chilled brewed coffee shaken with milk and cane syrup', price: 200, veg: null },
          { name: 'Cold Brew', description: 'Steeped for 18 hours and served over ice cubes', price: 220, veg: null },
          { name: 'Caramel Frappé', description: 'Blended espresso with milk, crushed ice and caramel syrup', price: 270, veg: null },
          { name: 'Iced Americano', description: 'Chilled espresso over water and cracked ice', price: 180, veg: null },
        ],
      },
      {
        category: 'Teas',
        items: [
          // SAMPLE items and prices
          { name: 'Masala Chai', description: 'Full-bodied black tea brewed with ginger and whole spices', price: 110, veg: null },
          { name: 'Assam English Breakfast', description: 'Single origin bold morning brew served with milk', price: 130, veg: null },
          { name: 'Green Tea', description: 'Whole leaf green tea with subtle grassy notes', price: 140, veg: null },
          { name: 'Earl Grey', description: 'Black tea infused with bergamot citrus notes', price: 150, veg: null },
        ],
      },
      {
        category: 'Bakes and Snacks',
        items: [
          // SAMPLE items and prices
          { name: 'Butter Croissant', description: 'Flaky golden baked French butter pastry', price: 160, veg: true },
          { name: 'Blueberry Muffin', description: 'Soft sponge muffin studded with plump blueberries', price: 170, veg: true },
          { name: 'Paneer Tikka Puff', description: 'Layered puff pastry filled with spiced cottage cheese', price: 150, veg: true },
          { name: 'Chicken & Herb Sandwich', description: 'Grilled multigrain sandwich with shredded herb chicken', price: 260, veg: false },
          { name: 'Veg Club Sandwich', description: 'Triple decker toast with cucumber, cheese and tomato slices', price: 220, veg: true },
        ],
      },
    ],
  },
  {
    id: 'pub',
    name: 'Pub',
    type: 'Pub',
    tagline: 'Draft pours, curated spirits, bar bites and upbeat evening atmosphere',
    cuisine: 'Pub Grub & Drinks',
    hours: '4:00 PM – 11:30 PM',
    minAge: 21,
    menu: [
      {
        category: 'Bar Bites',
        items: [
          // SAMPLE items and prices
          { name: 'Crisp Potato Wedges', description: 'Seasoned spiced potato wedges served with sour cream dip', price: 280, veg: true },
          { name: 'Chicken Wings', description: 'Tossed in spicy pepper glaze served with ranch dip', price: 420, veg: false },
          { name: 'Chilli Paneer Dry', description: 'Wok tossed paneer cubes with bell peppers and green chillies', price: 340, veg: true },
          { name: 'Loaded Nachos', description: 'Corn tortilla chips topped with salsa, melted cheese and jalapeños', price: 360, veg: true },
          { name: 'Fish and Chips', description: 'Battered river fish fillet served with tartar sauce and fries', price: 510, veg: false },
        ],
      },
      {
        category: 'Beers and Ciders',
        items: [
          // SAMPLE items and prices
          { name: 'Draft Lager Pint', description: 'Freshly poured crisp golden lager on tap (500 ml)', price: 320, veg: null },
          { name: 'Wheat Beer Pint', description: 'Cloudy Belgian style wheat beer on tap (500 ml)', price: 390, veg: null },
          { name: 'Indian Pale Ale', description: 'Aromatic bottled craft ale with citrus notes (330 ml)', price: 440, veg: null },
          { name: 'Apple Cider', description: 'Sweet and crisp fermented apple cider (330 ml)', price: 350, veg: null },
        ],
      },
      {
        category: 'Cocktails',
        items: [
          // SAMPLE items and prices
          { name: 'Whiskey Sour', description: 'Whiskey shaken with lemon juice, egg white and simple syrup', price: 550, veg: null },
          { name: 'Classic Mojito', description: 'White rum muddled with fresh mint sprigs, lime and soda', price: 490, veg: null },
          { name: 'Long Island Iced Tea', description: 'Five white spirits balanced with citrus and cola', price: 680, veg: null },
          { name: 'Old Fashioned', description: 'Bourbon stirred with aromatic bitters and orange peel', price: 620, veg: null },
        ],
      },
      {
        category: 'Mocktails',
        items: [
          // SAMPLE items and prices
          { name: 'Virgin Mojito', description: 'Muddled fresh mint, lime wedges and chilled soda', price: 240, veg: null },
          { name: 'Berry Fizz', description: 'Crushed mixed berries topped with sparkling citrus tonic', price: 260, veg: null },
          { name: 'Blue Lagoon Cooler', description: 'Blue curacao syrup shaken with lemon juice and lemonade', price: 250, veg: null },
          { name: 'Spiced Guava Punch', description: 'Guava juice with chilli salt rim and chat masala', price: 270, veg: null },
        ],
      },
      {
        category: 'Spirits (60 ml)',
        items: [
          // SAMPLE items and prices
          { name: 'Premium Blended Scotch', description: 'Aged 12 years blended malt (60 ml pour)', price: 680, veg: null },
          { name: 'Single Malt Whisky', description: 'Highland single malt with subtle oak finish (60 ml)', price: 850, veg: null },
          { name: 'London Dry Gin', description: 'Botanical distilled juniper spirit (60 ml)', price: 480, veg: null },
          { name: 'Aged Dark Rum', description: 'Smooth Caribbean blend dark rum (60 ml)', price: 360, veg: null },
        ],
      },
    ],
  },
  {
    id: 'lounge-bar',
    name: 'Lounge Bar',
    type: 'Lounge Bar',
    tagline: 'Sophisticated craft cocktails, single malts and small plates in an intimate lounge',
    cuisine: 'Cocktails & Small Plates',
    hours: '5:00 PM – 12:00 AM',
    minAge: 21,
    menu: [
      {
        category: 'Small Plates',
        items: [
          // SAMPLE items and prices
          { name: 'Truffle Mushroom Bruschetta', description: 'Toasted baguette rounds topped with sauteed forest mushrooms', price: 380, veg: true },
          { name: 'Lamb Seekh Kebab', description: 'Minced spiced lamb skewers cooked in the tandoor', price: 540, veg: false },
          { name: 'Smoked Salmon Crostini', description: 'Capers, dill cream cheese and thin salmon slices', price: 620, veg: false },
          { name: 'Falafel with Hummus', description: 'Crispy chickpea rounds with tahini dip and warm pita', price: 360, veg: true },
          { name: 'Prawn Tempura', description: 'Crispy batter-fried prawns served with sweet chilli dip', price: 580, veg: false },
        ],
      },
      {
        category: 'Cocktails',
        items: [
          // SAMPLE items and prices
          { name: 'Smoked Negroni', description: 'Gin, sweet vermouth and Campari smoked with orange zest', price: 650, veg: null },
          { name: 'Espresso Martini', description: 'Fresh espresso shot shaken with vodka and coffee liqueur', price: 590, veg: null },
          { name: 'French 75', description: 'Gin, fresh lemon juice and sparkling wine', price: 720, veg: null },
          { name: 'Penicillin', description: 'Scotch whisky, ginger-honey syrup, lemon and peated float', price: 780, veg: null },
        ],
      },
      {
        category: 'Mocktails',
        items: [
          // SAMPLE items and prices
          { name: 'Cucumber Basil Cooler', description: 'Muddled cucumber, basil leaves and sparkling water', price: 260, veg: null },
          { name: 'Ginger Mint Sparkler', description: 'Fresh ginger reduction with mint and ginger ale', price: 280, veg: null },
          { name: 'Passionfruit Spritz', description: 'Passionfruit puree topped with tonic and citrus slice', price: 310, veg: null },
          { name: 'Pomegranate Mule', description: 'Fresh pomegranate juice, lime and spicy ginger beer', price: 290, veg: null },
        ],
      },
      {
        category: 'Spirits (60 ml)',
        items: [
          // SAMPLE items and prices
          { name: 'Speyside Single Malt 15 YO', description: 'Fruity notes with honeyed oak complexity (60 ml)', price: 920, veg: null },
          { name: 'Islay Peated Single Malt 12 YO', description: 'Heavy peat smoke with saline finish (60 ml)', price: 1050, veg: null },
          { name: 'Japanese Blended Whisky', description: 'Delicate floral and soft spice profile (60 ml)', price: 980, veg: null },
          { name: 'Craft Botanical Gin', description: 'Infused with citrus, cardamom and coriander (60 ml)', price: 620, veg: null },
        ],
      },
    ],
  },
  {
    id: 'rooftop-restaurant',
    name: 'Rooftop Restaurant',
    type: 'Rooftop Restaurant',
    tagline: 'Open-air terrace dining with river breezes, live grills and sunset views',
    cuisine: 'Grills & Continental',
    hours: '6:30 PM – 11:30 PM',
    minAge: 0,
    menu: [
      {
        category: 'Starters',
        items: [
          // SAMPLE items and prices
          { name: 'Mezze Platter', description: 'Hummus, baba ganoush, tzatziki, olives and warm flatbread', price: 460, veg: true },
          { name: 'Charred Cottage Cheese Skewers', description: 'Marinated paneer grilled with peppers and chimichurri', price: 420, veg: true },
          { name: 'Calamari Fritti', description: 'Tender squid rings dusted with paprika flour and tartar sauce', price: 580, veg: false },
          { name: 'Smoked Chicken Tartlets', description: 'Baked savoury pastry cups with herb-smoked chicken', price: 490, veg: false },
        ],
      },
      {
        category: 'Grills',
        items: [
          // SAMPLE items and prices
          { name: 'Grilled River Fish Steak', description: 'Catch of the day with lemon caper butter and grilled vegetables', price: 890, veg: false },
          { name: 'Herb Crusted Lamb Chops', description: 'New Zealand lamb chops grilled with rosemary jus and mash', price: 1350, veg: false },
          { name: 'Peri Peri Half Chicken', description: 'Spatchcock chicken basted in African bird eye chilli marinade', price: 780, veg: false },
          { name: 'Barbecue Paneer & Vegetable Skewer', description: 'Cottage cheese, zucchini and bell peppers basted with BBQ glaze', price: 680, veg: true },
          { name: 'Tiger Prawns on Skewer', description: 'Garlic herb butter glazed grilled jumbo prawns', price: 1250, veg: false },
        ],
      },
      {
        category: 'Mains',
        items: [
          // SAMPLE items and prices
          { name: 'Wild Mushroom Risotto', description: 'Arborio rice slow-stirred with porcini stock and parmesan', price: 580, veg: true },
          { name: 'Pan-Seared Chicken Breast', description: 'Served on creamy polenta with wild mushroom reduction', price: 690, veg: false },
          { name: 'Four Cheese Woodfired Pizza', description: 'Mozzarella, parmesan, gorgonzola and cheddar on thin crust', price: 560, veg: true },
          { name: 'Penne Arrabbiata', description: 'Penne pasta in spicy tomato, garlic and dried chilli sauce', price: 480, veg: true },
        ],
      },
      {
        category: 'Desserts',
        items: [
          // SAMPLE items and prices
          { name: 'Classic Tiramisu', description: 'Savoiardi soaked in espresso with mascarpone cream', price: 340, veg: true },
          { name: 'Molten Lava Cake', description: 'Warm chocolate cake with flowing centre and vanilla cream', price: 380, veg: true },
          { name: 'Cheesecake with Berry Coulis', description: 'Baked New York style cream cheesecake with berry sauce', price: 360, veg: true },
        ],
      },
      {
        category: 'Mocktails',
        items: [
          // SAMPLE items and prices
          { name: 'Sunset Sparkler', description: 'Orange juice, cranberry and sparkling soda layered over crushed ice', price: 290, veg: null },
          { name: 'Rosewater Lemonade', description: 'Fresh lemon juice, rose syrup and sparkling mineral water', price: 270, veg: null },
          { name: 'Watermelon Basil Cooler', description: 'Cold-pressed watermelon with fresh basil and lemon', price: 310, veg: null },
        ],
      },
    ],
  },
];

export function getVenues() {
  return venues;
}

export function getVenueById(id) {
  return venues.find((v) => v.id === id) || null;
}
