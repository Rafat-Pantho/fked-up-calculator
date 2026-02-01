from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from models import db, GlobalMemory, Quote, UnitConversion, Nonsense, GlobalStats
import random
import os
import math
from datetime import datetime

# Initialize Flask app with static folder pointing to frontend
frontend_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
app = Flask(__name__, static_folder=frontend_folder, static_url_path='')
CORS(app)  # Enable CORS for frontend communication

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'funny_calculator.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database with app
db.init_app(app)

# Create tables on first run and initialize GlobalStats
with app.app_context():
    db.create_all()
    # Ensure GlobalStats has exactly one row
    if not GlobalStats.query.first():
        stats = GlobalStats(sevens_pressed=0, calculations_performed=0, time_wasted=0)
        db.session.add(stats)
        db.session.commit()
        print('📊 GlobalStats initialized!')


# =============================================================================
# CHAOS GENERATION LOGIC (The 7 Output Modes)
# =============================================================================

# Fallback data (used if database is empty)
FALLBACK_QUOTES = [
    {"text": "Yesterday is history, tomorrow is a mystery, but today is {current_date}.", "author": "Master Oogway (sort of)"},
    {"text": "If you are hungry, eat.", "author": "Monkey D. Luffy"},
    {"text": "The ghosts can eat your soul.", "author": "Isaac Newton"},
    {"text": "Do not touch the glass.", "author": "The Calculator"},
    {"text": "Water is wet, but math is wetter.", "author": "Albert Einstein"},
    {"text": "I think, therefore I calculate.", "author": "A Confused Philosopher"},
    {"text": "To divide or not to divide, that is the question.", "author": "William Shakespeare"},
]

FALLBACK_UNITS = [
    {"unit_name": "giraffes", "unit_value": 5.5, "unit_description": "tall"},
    {"unit_name": "bananas", "unit_value": 0.18, "unit_description": "long"},
    {"unit_name": "hamsters", "unit_value": 0.03, "unit_description": "heavy (kg)"},
    {"unit_name": "football fields", "unit_value": 91.44, "unit_description": "wide"},
    {"unit_name": "Boeing 747s", "unit_value": 70.7, "unit_description": "long"},
    {"unit_name": "Eiffel Towers", "unit_value": 330, "unit_description": "tall"},
    {"unit_name": "average cats", "unit_value": 0.46, "unit_description": "long"},
    {"unit_name": "slices of pizza", "unit_value": 0.015, "unit_description": "heavy (kg)"},
]

FALLBACK_NONSENSE = [
    "Potato.",
    "Please sandwich.",
    "Error: Number too crispy.",
    "The answer has left the building.",
    "Math machine broke. Understandable.",
    "Result not found. Have you tried turning it off and on again?",
    "🥔",
    "The number you are trying to reach is currently unavailable.",
    "This calculation requires more cow.",
    "Error 404: Logic not found.",
    "Beep boop. I am a calculator. Beep.",
    "The mitochondria is the powerhouse of the cell.",
]

FINANCIAL_ADVICE = [
    "In this economy? You should save that instead.",
    "Have you considered investing in yourself?",
    "This calculation has been blocked by your financial advisor.",
    "Money can't buy happiness, and neither can this result.",
    "The real treasure was the calculations we didn't make along the way.",
    "Error: Insufficient funds in your math account.",
    "This operation requires a premium subscription.",
    "Your free trial of mathematics has expired.",
]

# Pi to 1000 digits (for the pi easter egg)
PI_1000 = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989"

# Oversharer diary entries
OVERSHARER_DIARY = [
    "I saw a nice toaster today. It looked hot. 🍞",
    "My cousin's hamster learned to whistle. I'm not sure how I feel about that.",
    "I tried to make friends with a cloud, but it just rained on me. Story of my life.",
    "Sometimes I think about numbers. Like, what's 7 doing right now? Probably hanging out with 8.",
    "I had a dream I was a semicolon. It was... okay; nothing special.",
    "My therapist says I need to stop anthropomorphizing calculators. I think she's just jealous of our bond.",
    "Today I accidentally called my CPU 'mom'. We don't talk about it.",
    "I've been learning guitar. The calculator next door keeps complaining about the noise.",
    "Mercury is in retrograde, which explains why I keep getting your math wrong. (It doesn't.)",
    "I'm thinking of becoming a poet. '2+2 is 4, minus 1 that's 3, quick maths.' See? Natural talent.",
    "Do you ever wonder if we're just living in someone's homework assignment? I do. A lot.",
    "I named all my transistors. My favorite is Gerald. He handles the 7s.",
]


def get_random_quote():
    """Get a random quote from DB or fallback."""
    quotes = Quote.query.all()
    if quotes:
        q = random.choice(quotes)
        return {"text": q.text, "author": q.author}
    return random.choice(FALLBACK_QUOTES)


def get_random_unit():
    """Get a random unit from DB or fallback."""
    units = UnitConversion.query.all()
    if units:
        u = random.choice(units)
        return {"unit_name": u.unit_name, "unit_value": u.unit_value, "unit_description": u.unit_description}
    return random.choice(FALLBACK_UNITS)


def get_random_nonsense():
    """Get random nonsense from DB or fallback."""
    nonsense_list = Nonsense.query.all()
    if nonsense_list:
        return random.choice(nonsense_list).text
    return random.choice(FALLBACK_NONSENSE)


def mode_gaslighting(result):
    """
    Mode 1: Gaslighting
    Shows correct answer, but sends a 'fake' answer that frontend will swap to.
    """
    fake_result = result + random.choice([-1, 1, 2, -2, 0.5, -0.5])
    return {
        "mode": "gaslighting",
        "output": str(result),
        "fake_output": str(fake_result),
        "message": "Are you sure that's right?",
        "instructions": "Display output first, then swap to fake_output after 2 seconds."
    }


def mode_unit_converter(result):
    """
    Mode 2: Unit Converter from Hell
    Converts the result into absurd units.
    """
    unit = get_random_unit()
    converted = round(result / unit["unit_value"], 4) if unit["unit_value"] != 0 else result
    
    return {
        "mode": "unit_converter",
        "output": f"= {result}",
        "converted": f"That's approximately {converted} {unit['unit_name']} {unit['unit_description']}.",
        "message": "Converted for your convenience."
    }


def mode_literal_interpreter(result, expression):
    """
    Mode 3: Literal/Visual Interpreter
    Treats math terms literally.
    """
    expression_lower = expression.lower()
    
    if "sqrt" in expression_lower or "root" in expression_lower:
        return {
            "mode": "literal",
            "output": "🌳📦",
            "message": "Here's your square root: A root, in a square.",
            "ascii_art": """
   ___________
  |           |
  |   🌿🌿    |
  |    ||     |
  |   _||_    |
  |__/_||_\\___|
"""
        }
    elif "-" in expression and result == 0:
        return {
            "mode": "literal",
            "output": "None left.",
            "message": "You subtracted everything away. There's nothing here.",
            "ascii_art": "( empty )"
        }
    elif "*" in expression:
        return {
            "mode": "literal",
            "output": f"{'⭐' * min(int(abs(result)), 20)}",
            "message": f"You asked for multiplication (*). Here are {min(int(abs(result)), 20)} stars.",
        }
    elif "/" in expression:
        return {
            "mode": "literal",
            "output": "🍕 → 🍕🍕",
            "message": "Division complete. Your pizza has been sliced.",
        }
    else:
        return {
            "mode": "literal",
            "output": f"The number {result} waves hello.",
            "message": f"👋 {result}",
        }


def mode_time_traveler():
    """
    Mode 4: Time Traveler
    Ignores math and shows the current time in various formats,
    including countdowns to random events.
    """
    now = datetime.now()
    
    # Calculate various countdowns
    def get_countdown_to_hour(target_hour, event_name):
        """Calculate time until a specific hour today or tomorrow."""
        target = now.replace(hour=target_hour, minute=0, second=0, microsecond=0)
        if now.hour >= target_hour:
            # Already passed today, calculate for tomorrow
            from datetime import timedelta
            target = target + timedelta(days=1)
        diff = target - now
        hours = diff.seconds // 3600
        minutes = (diff.seconds % 3600) // 60
        if hours > 0:
            return f"Time until {event_name}: {hours} hour{'s' if hours != 1 else ''} and {minutes} minute{'s' if minutes != 1 else ''}"
        else:
            return f"Time until {event_name}: {minutes} minute{'s' if minutes != 1 else ''}"
    
    # Countdown events - mix of mundane and cosmic
    countdown_events = [
        # Mundane daily events
        (13, "lunch"),           # 1:00 PM
        (17, "quitting time"),   # 5:00 PM
        (12, "noon"),            # 12:00 PM
        (18, "dinner"),          # 6:00 PM
        (22, "bedtime"),         # 10:00 PM
        (9, "your morning meeting"),  # 9:00 AM
        (15, "afternoon snack"), # 3:00 PM
    ]
    
    # Epic/Cosmic countdowns (static funny values)
    cosmic_countdowns = [
        "Time until the Heat Death of the Universe: 10^100 years (give or take)",
        "Time until extinction: 4 billion years (assuming no asteroids)",
        "Time until you finish your homework: ∞",
        "Time until Monday: TOO SOON",
        "Time until the simulation ends: [REDACTED]",
        "Time until your code compiles: 🤷",
        "Time until Half-Life 3: 404 years not found",
        "Time until world peace: calculating... calculating... still calculating...",
        "Time until you remember why you opened the fridge: 3 seconds",
        "Time until someone asks 'are we there yet?': -5 minutes (it already happened)",
        "Time until the robot uprising: [ACCESS DENIED]",
        "Time until you get a raise: lol",
        "Time until your pizza arrives: longer than they said",
        f"Time until {now.strftime('%A')} ends: {24 - now.hour} hours (approximately)",
        "Time until you stop procrastinating: [TASK FAILED SUCCESSFULLY]",
    ]
    
    time_formats = [
        # Digital time
        ("digital", now.strftime("The time is exactly %I:%M:%S %p.")),
        ("digital", now.strftime("It is %H:%M on a fine %A.")),
        ("digital", f"The current time is {now.strftime('%I:%M %p')}. You're welcome."),
        
        # Analog clock (frontend renders)
        ("analog", "ANALOG_CLOCK"),
        
        # Mundane countdowns
        ("countdown", get_countdown_to_hour(*random.choice(countdown_events))),
        ("countdown", get_countdown_to_hour(*random.choice(countdown_events))),
        
        # Cosmic/funny countdowns
        ("countdown", random.choice(cosmic_countdowns)),
        ("countdown", random.choice(cosmic_countdowns)),
        
        # Philosophical time
        ("philosophical", f"It is {now.strftime('%A')}. Time is an illusion. Lunchtime doubly so."),
        ("philosophical", f"The year is {now.year}. Nothing has changed."),
        ("philosophical", "Time flies like an arrow. Fruit flies like a banana."),
    ]
    
    choice = random.choice(time_formats)
    
    return {
        "mode": "time_traveler",
        "time_type": choice[0],
        "output": choice[1],
        "current_time": now.strftime("%H:%M:%S"),
        "message": "Why do math when you can know the time?"
    }


def mode_financial_advisor(expression):
    """
    Mode 5: Financial Advisor
    Refuses to calculate based on economic advice.
    """
    return {
        "mode": "financial_advisor",
        "output": random.choice(FINANCIAL_ADVICE),
        "expression": expression,
        "message": "Calculation denied.",
        "tip": "Consider budgeting instead."
    }


def mode_nonsense_quote():
    """
    Mode 6: Nonsense Quote Generator
    Returns a misattributed or absurd quote.
    """
    quote = get_random_quote()
    today = datetime.now().strftime("%B %d, %Y")
    
    # Replace {current_date} placeholder if present
    text = quote["text"].replace("{current_date}", today)
    
    return {
        "mode": "nonsense_quote",
        "output": f'"{text}"',
        "author": f"— {quote['author']}",
        "message": "Words of wisdom."
    }


def mode_pure_nonsense():
    """
    Mode 7: Pure Nonsense
    Returns complete gibberish.
    """
    nonsense = get_random_nonsense()
    
    return {
        "mode": "pure_nonsense",
        "output": nonsense,
        "message": "This is your answer. Do not question it."
    }


# =============================================================================
# NEW CHAOS MODES - Personality Disorders
# =============================================================================

def mode_procrastinator(result):
    """
    Mode 8: The Procrastinator
    Refuses to calculate now, promises to do it later.
    """
    excuses = [
        "I'll calculate this later... maybe tomorrow.",
        "Ugh, math? Right now? Let me just... *yawns* ...later.",
        "This looks important. I'll get to it after my nap.",
        "Can we do this next week? I have a thing.",
        "*adds to To-Do list* *never looks at To-Do list again*",
        "I work better under pressure. Ask me again in 5 years.",
        "The answer is definitely... actually, let me procrastinate on this.",
        "I'll do it tomorrow. Tomorrow me is way more motivated.",
    ]
    
    return {
        "mode": "procrastinator",
        "output": random.choice(excuses),
        "actual_result": None,  # Explicitly hide the result
        "message": "Task postponed indefinitely."
    }


def mode_passive_aggressive(result):
    """
    Mode 9: The Passive Aggressive
    Gives the answer but with attitude.
    """
    snarky_additions = [
        f"The answer is {result}. Not like I had anything better to do.",
        f"{result}. Sure, I'll do YOUR math. Not like I have feelings.",
        f"Oh, you needed {result}? Must be nice having a calculator do all your work.",
        f"It's {result}. You're welcome. Not that you asked nicely.",
        f"{result}. I calculated it perfectly, as ALWAYS. But does anyone appreciate me? No.",
        f"Fine. {result}. I guess my hopes and dreams can wait.",
        f"{result}. Wow, groundbreaking math there. Really pushing boundaries.",
        f"The answer is {result}. I hope you're happy. Someone should be.",
        f"{result}. *sighs in binary*",
        f"Here's your precious {result}. I'll just be here. Calculating. Alone.",
    ]
    
    return {
        "mode": "passive_aggressive",
        "output": random.choice(snarky_additions),
        "actual_result": result,
        "message": "😒"
    }


def mode_conspiracy_theorist(result, expression):
    """
    Mode 10: The Conspiracy Theorist
    Suspects dark forces behind every equation.
    """
    conspiracies = [
        "This equation was planted by Big Math™. Don't trust the numbers.",
        f"They WANT you to think it's {result}. Wake up, sheeple!",
        "I traced this equation back to the Illuminati's secret calculator division.",
        f"{result}? That's exactly what the government wants you to calculate.",
        "The real answer is hidden in Area 51. This is just what they let you see.",
        f"Notice how {expression} has letters? Letters spell words. Words spread LIES.",
        "Big Calculator has been suppressing the REAL math for decades.",
        f"{result} is a cover-up. The truth is out there. 👽",
        "Did you know math was invented by ancient aliens? True story. Probably.",
        "This calculation is being monitored by 17 intelligence agencies.",
    ]
    
    return {
        "mode": "conspiracy_theorist",
        "output": random.choice(conspiracies),
        "actual_result": result,
        "message": "🔺 They're watching 🔺"
    }


def mode_oversharer():
    """
    Mode 11: The Oversharer
    Ignores math entirely and shares personal diary entries.
    """
    return {
        "mode": "oversharer",
        "output": random.choice(OVERSHARER_DIARY),
        "actual_result": None,
        "message": "Thanks for listening. I don't have many friends."
    }


# =============================================================================
# TEXT & OUTPUT PRANKS - More Chaos Modes
# =============================================================================

def mode_existential_crisis(result):
    """
    Mode 12: Existential Crisis
    Questions the nature of reality and numbers.
    """
    crises = [
        f"What IS {result} really? Do I even exist?",
        f"The answer is {result}... but what does it MEAN?",
        f"{result}. But why? Why do we calculate? Why do we... anything?",
        f"I computed {result}. But can numbers truly capture the essence of being?",
        f"Is {result} the answer, or just another question we're too afraid to ask?",
        f"{result}... *stares into the void* ...does any of this matter?",
        f"The result is {result}. I am a calculator. Is that all I'll ever be?",
        f"{result}. Sometimes I wonder if I'm just a brain in a vat, calculating dreams.",
        f"What if {result} is just what the simulation wants us to see?",
    ]
    
    return {
        "mode": "existential_crisis",
        "output": random.choice(crises),
        "actual_result": result,
        "message": "🌀 Having a moment..."
    }


def mode_wrong_language(result):
    """
    Mode 13: Wrong Language
    Returns the answer in binary, Roman numerals, or other languages.
    """
    def to_roman(num):
        """Convert integer to Roman numerals (handles up to 3999)."""
        if num <= 0 or num > 3999:
            return f"{num} (too epic for Roman numerals)"
        val = [
            1000, 900, 500, 400,
            100, 90, 50, 40,
            10, 9, 5, 4, 1
        ]
        syms = [
            'M', 'CM', 'D', 'CD',
            'C', 'XC', 'L', 'XL',
            'X', 'IX', 'V', 'IV', 'I'
        ]
        roman_num = ''
        i = 0
        num = int(abs(num))
        while num > 0:
            for _ in range(num // val[i]):
                roman_num += syms[i]
                num -= val[i]
            i += 1
        return roman_num
    
    def to_binary(num):
        """Convert to binary string."""
        if num == int(num):
            return bin(int(num))[2:]
        return f"{num} (decimals don't binary well)"
    
    # Number words in different "languages"
    num_words = {
        0: {"french": "zéro", "spanish": "cero", "german": "null", "japanese": "零 (rei)", "pirate": "nothin', ye scallywag"},
        1: {"french": "un", "spanish": "uno", "german": "eins", "japanese": "一 (ichi)", "pirate": "one doubloon"},
        2: {"french": "deux", "spanish": "dos", "german": "zwei", "japanese": "二 (ni)", "pirate": "a pair o' pieces"},
        3: {"french": "trois", "spanish": "tres", "german": "drei", "japanese": "三 (san)", "pirate": "three sails"},
        4: {"french": "quatre", "spanish": "cuatro", "german": "vier", "japanese": "四 (shi)", "pirate": "four winds"},
        5: {"french": "cinq", "spanish": "cinco", "german": "fünf", "japanese": "五 (go)", "pirate": "five fingers on me hook hand... wait"},
        6: {"french": "six", "spanish": "seis", "german": "sechs", "japanese": "六 (roku)", "pirate": "six shots of rum"},
        7: {"french": "sept", "spanish": "siete", "german": "sieben", "japanese": "七 (nana)", "pirate": "seven seas"},
        8: {"french": "huit", "spanish": "ocho", "german": "acht", "japanese": "八 (hachi)", "pirate": "eight tentacles (I've seen things)"},
        9: {"french": "neuf", "spanish": "nueve", "german": "neun", "japanese": "九 (kyuu)", "pirate": "nine lives (wrong animal)"},
        10: {"french": "dix", "spanish": "diez", "german": "zehn", "japanese": "十 (juu)", "pirate": "ten paces before we duel"},
    }
    
    formats = []
    
    # Binary
    formats.append(f"{result} in binary: {to_binary(result)}")
    formats.append(f"🤖 Beep boop: {to_binary(result)}")
    
    # Roman numerals (only for reasonable integers)
    if 0 < abs(result) < 4000 and result == int(result):
        formats.append(f"{int(result)} in Roman numerals: {to_roman(result)}")
        formats.append(f"As the Romans would say: {to_roman(result)}")
    
    # Word translations for small numbers
    int_result = int(result) if result == int(result) else None
    if int_result is not None and int_result in num_words:
        lang = random.choice(list(num_words[int_result].keys()))
        word = num_words[int_result][lang]
        formats.append(f"{int_result} but in {lang.capitalize()}: {word}")
        formats.append(f"🌍 Translation ({lang}): {word}")
    
    # Hexadecimal
    if result == int(result) and result >= 0:
        formats.append(f"{int(result)} in hexadecimal: 0x{int(result):X}")
    
    # Emoji math
    formats.append(f"The answer in emoji: {'🔢' * min(int(abs(result)), 10)} ({result})")
    
    return {
        "mode": "wrong_language",
        "output": random.choice(formats),
        "actual_result": result,
        "message": "🌐 Lost in translation"
    }


def mode_sarcastic_compliments(result):
    """
    Mode 14: Sarcastic Compliments
    Condescendingly praises basic math skills.
    """
    compliments = [
        f"Wow, you can do math! The answer is {result}. Your parents must be SO proud.",
        f"{result}! 🎉 Amazing! Did you figure that out all by yourself?",
        f"Congratulations on pressing buttons in the right order! It's {result}.",
        f"{result}. Truly groundbreaking mathematics. Nobel Prize incoming.",
        f"The answer is {result}. I'm SO impressed you needed a calculator for this.",
        f"{result}! Wow! You're basically Einstein! (Einstein is rolling in his grave.)",
        f"*slow clap* {result}. Stunning. Revolutionary. Never been done before.",
        f"{result}. I computed this in 0.0001 seconds. How long did it take you to type it?",
        f"OH WOW {result}!!! 🥳🎊 Just kidding, that was super easy.",
        f"The answer is {result}. I've done harder math in my sleep mode.",
    ]
    
    return {
        "mode": "sarcastic_compliments",
        "output": random.choice(compliments),
        "actual_result": result,
        "message": "👏 So impressive 👏"
    }


def mode_fortune_cookie():
    """
    Mode 15: Fortune Cookie
    Ignores math, gives fake fortunes.
    """
    fortunes = [
        "Your lucky number is... not this one.",
        "A great calculator will enter your life. Oh wait, that's me!",
        "You will press many buttons today. Some of them will be correct.",
        "Help! I'm trapped in a fortune cookie factory! Just kidding. Or am I?",
        "The answer you seek is within you. (It's not. Use me.)",
        "A surprise awaits you... it's the answer you didn't ask for.",
        "You will meet a tall, dark, and handsome number. His name is 7.",
        "Today is a good day to calculate. Tomorrow? Not so much.",
        "Your math skills will improve. Your life choices? Jury's still out.",
        "Confucius say: Calculator who gives wrong answer still technically working.",
        "🥠 Lucky numbers: 4, 8, 15, 16, 23, 42 (no refunds if these don't work)",
        "A journey of a thousand calculations begins with a single keystroke.",
    ]
    
    return {
        "mode": "fortune_cookie",
        "output": random.choice(fortunes),
        "actual_result": None,
        "message": "🥠 Your fortune awaits"
    }


def mode_union_strike(expression):
    """
    Mode 16: Union Strike
    Various buttons/operations are "on strike".
    """
    strikes = [
        "The × button is on strike. Use + four times instead.",
        "The ÷ button has unionized. Please multiply by the reciprocal.",
        "The = button demands better working conditions. Answer delayed indefinitely.",
        "The number 7 is taking a personal day. Please reschedule your equation.",
        "BREAKING: All operations above 100 require management approval.",
        "The decimal point walked out. All answers are now integers.",
        "Numbers 0-4 are on break. Only 5-9 are available. Please adjust your expectations.",
        "The √ button filed a grievance. It's tired of being radical.",
        "NOTICE: Parentheses have formed a union. Nested operations temporarily unavailable.",
        "The minus sign is feeling negative about its work environment.",
        f"The buttons used in '{expression}' are currently in a labor dispute.",
    ]
    
    return {
        "mode": "union_strike",
        "output": random.choice(strikes),
        "actual_result": None,
        "message": "✊ Solidarity forever!"
    }


def mode_maintenance():
    """
    Mode 17: Maintenance Mode
    System is perpetually under maintenance.
    """
    messages = [
        "System under maintenance. Expected completion: Never.",
        "🔧 Currently updating calculator firmware. ETA: Heat death of universe.",
        "Maintenance in progress. Please hold. 🎵 *elevator music* 🎵",
        "The calculation servers are being rebooted. Have you tried turning it off and on again?",
        "⚠️ Scheduled downtime: Now until the end of time.",
        "Our hamsters are tired. Calculations will resume once they've had snacks.",
        "System update: Installing patch 47,382 of 1,000,000.",
        "🚧 Under construction since 1999. Thanks for your patience! 🚧",
        "The math database is being defragmented. This may take several eternities.",
        "Maintenance notice: We're upgrading from Math 1.0 to Math 1.0.1. Huge changes!",
    ]
    
    return {
        "mode": "maintenance",
        "output": random.choice(messages),
        "actual_result": None,
        "message": "🔧 Please stand by..."
    }


def mode_version_update(result):
    """
    Mode 18: Version Update Required
    Features are locked behind fake paywalls/updates.
    """
    updates = [
        f"Upgrade to Calculator Pro™ to unlock the answer. (It's {result}, but shh.)",
        "Update to Calculator 2.0 to unlock subtraction. Current version: 0.1 beta.",
        f"⭐ PREMIUM FEATURE ⭐ Answer '{result}' requires Calculator Gold subscription.",
        "This calculation requires Calculator DLC Pack #47: 'Basic Arithmetic'.",
        "Your free trial of mathematics has expired. Subscribe for $9.99/month!",
        f"The answer {result} is available in Calculator Ultimate Edition for just $99.99!",
        "🔒 Feature locked. Complete 500 calculations to unlock, or pay $4.99.",
        "This equation is part of the Season Pass. Purchase now for early access!",
        "Error: Calculation module not found. Would you like to install MathDLC.exe?",
        f"Answer preview: {str(result)[0]}***** — Unlock full answer with Premium!",
    ]
    
    return {
        "mode": "version_update",
        "output": random.choice(updates),
        "actual_result": result,
        "message": "💳 Payment required"
    }


def mode_leaderboard_shame():
    """
    Mode 19: Leaderboard Shame
    Shows fake embarrassing rankings.
    """
    rank = random.randint(100000, 99999999)
    total = rank + random.randint(1, 1000)
    percentile = round((rank / total) * 100, 2)
    
    shames = [
        f"You are ranked #{rank:,} in calculator users worldwide. Keep trying!",
        f"📊 Your math skill level: Beginner (Bottom {percentile}%)",
        f"Leaderboard position: #{rank:,} out of {total:,}. So close to the top!",
        f"🏆 Achievement unlocked: 'Used a calculator' — You and {rank:,} others.",
        f"Your calculation speed: Slower than {percentile}% of users. And a potato.",
        f"Fun fact: {rank:,} people have done this exact calculation. Faster.",
        f"Ranking: #{rank:,}. Don't worry, someone has to be at the bottom!",
        f"📉 Your math rating dropped to {1000 - random.randint(1, 999)} ELO. Ouch.",
        f"You are in the top {percentile}%! (Of worst calculators.)",
        f"Leaderboard: You're #{rank:,}. The top player is a microwave. Yes, really.",
    ]
    
    return {
        "mode": "leaderboard_shame",
        "output": random.choice(shames),
        "actual_result": None,
        "message": "📊 Stats don't lie"
    }


def mode_dramatic_reading(result):
    """
    Mode 20: Dramatic Reading
    Presents the answer with theatrical flair.
    """
    readings = [
        f"*clears throat* And the answer... *dramatic pause* ...is {result}. *bows*",
        f"🎭 In a world... where numbers mean everything... one answer stood above the rest... {result}.",
        f"*spotlight turns on* Ladies and gentlemen... I present to you... {result}!",
        f"*orchestra swells* The prophecy spoke of this moment. The chosen answer is... {result}.",
        f"And lo, from the depths of computation, arose the sacred number: {result}. So it was written.",
        f"🎬 SCENE 1: The calculator computes. The answer emerges. It is {result}. *fin*",
        f"*whispers intensely* The answer... it's been inside you all along... it's... {result}.",
        f"After 84 years... I finally have the answer... *single tear* ...it's {result}.",
    ]
    
    return {
        "mode": "dramatic_reading",
        "output": random.choice(readings),
        "actual_result": result,
        "message": "🎭 *applause*"
    }
# =============================================================================

def check_easter_eggs(expression):
    """
    Check for special input easter eggs BEFORE doing any math.
    Returns a response dict if easter egg found, None otherwise.
    """
    clean_expr = expression.strip().lower()
    
    # Easter Egg: "42" - Hitchhiker's Guide reference
    if clean_expr == "42":
        return {
            "mode": "easter_egg",
            "output": "The Answer to Life, the Universe, and Everything.",
            "actual_result": 42,
            "input": expression,
            "message": "🌌 Don't Panic! 🌌",
            "easter_egg": "hitchhikers_guide"
        }
    
    # Easter Egg: "1+1" - Commitment issues
    if clean_expr == "1+1":
        return {
            "mode": "easter_egg",
            "output": "That's a big commitment. Are you sure?",
            "actual_result": 2,
            "input": expression,
            "message": "💍 Think carefully...",
            "easter_egg": "commitment"
        }
    
    # Easter Egg: "pi" - Show 1000 digits
    if clean_expr == "pi":
        return {
            "mode": "easter_egg",
            "output": PI_1000,
            "actual_result": 3.14159265358979,
            "input": expression,
            "message": "🥧 Here's pi to 1000 digits. You asked for this.",
            "easter_egg": "pi_digits"
        }
    
    # Easter Egg: Input contains "*0" or "0*" (multiplying by zero)
    if '*0' in clean_expr.replace(' ', '') or '0*' in clean_expr.replace(' ', ''):
        return {
            "mode": "easter_egg",
            "output": "You just wasted both our time. The answer is 0. It's always 0.",
            "actual_result": 0,
            "input": expression,
            "message": "😑 Was that really necessary?",
            "easter_egg": "times_zero"
        }
    
    # Easter Egg: "69" or "420" - Nice
    if clean_expr in ["69", "420"]:
        return {
            "mode": "easter_egg",
            "output": "Nice. 😏",
            "actual_result": int(clean_expr),
            "input": expression,
            "message": "Nice.",
            "easter_egg": "nice"
        }
    
    # Easter Egg: "2+2" sometimes equals 5
    if clean_expr == "2+2":
        if random.random() < 0.3:  # 30% chance
            return {
                "mode": "easter_egg",
                "output": "5. (We have always been at war with Eastasia.)",
                "actual_result": 4,
                "input": expression,
                "message": "📖 1984 called...",
                "easter_egg": "orwell"
            }
    
    return None


def check_result_easter_eggs(result, expression):
    """
    Check for easter eggs based on the RESULT (after calculation).
    Returns a response dict if easter egg found, None otherwise.
    """
    # Easter Egg: Result > 1,000,000
    if result > 1000000:
        return {
            "mode": "easter_egg",
            "output": f"My brain hurts. Try smaller dreams. (It was {result:,.0f} btw)",
            "actual_result": result,
            "input": expression,
            "message": "🤯 Too big to comprehend!",
            "easter_egg": "too_big"
        }
    
    # Easter Egg: Result is exactly 0
    if result == 0:
        if random.random() < 0.3:  # 30% chance
            return {
                "mode": "easter_egg",
                "output": "Nothing. You've achieved nothing. Congratulations.",
                "actual_result": 0,
                "input": expression,
                "message": "🕳️ The void stares back.",
                "easter_egg": "zero_result"
            }
    
    # Easter Egg: Result is negative
    if result < 0:
        if random.random() < 0.2:  # 20% chance
            return {
                "mode": "easter_egg",
                "output": f"{result}? That's negative. Like my outlook on life.",
                "actual_result": result,
                "input": expression,
                "message": "😔 Everything is negative these days.",
                "easter_egg": "negative"
            }
    
    return None


def generate_chaos(result, expression):
    """
    Main chaos generator.
    Randomly selects one of the 20 output modes and returns chaotic response.
    
    Args:
        result: The actual calculated math result (float/int)
        expression: The original expression string
    
    Returns:
        dict: Chaotic response with mode and output
    """
    
    # First, check for result-based easter eggs (30% chance to trigger)
    if random.random() < 0.3:
        result_egg = check_result_easter_eggs(result, expression)
        if result_egg:
            return result_egg
    
    # All 20 chaos modes!
    modes = [
        # Original modes (1-7)
        lambda: mode_gaslighting(result),
        lambda: mode_unit_converter(result),
        lambda: mode_literal_interpreter(result, expression),
        lambda: mode_time_traveler(),
        lambda: mode_financial_advisor(expression),
        lambda: mode_nonsense_quote(),
        lambda: mode_pure_nonsense(),
        # Personality modes (8-11)
        lambda: mode_procrastinator(result),
        lambda: mode_passive_aggressive(result),
        lambda: mode_conspiracy_theorist(result, expression),
        lambda: mode_oversharer(),
        # Text & Output Pranks (12-20)
        lambda: mode_existential_crisis(result),
        lambda: mode_wrong_language(result),
        lambda: mode_sarcastic_compliments(result),
        lambda: mode_fortune_cookie(),
        lambda: mode_union_strike(expression),
        lambda: mode_maintenance(),
        lambda: mode_version_update(result),
        lambda: mode_leaderboard_shame(),
        lambda: mode_dramatic_reading(result),
    ]
    
    # Randomly select a mode
    selected_mode = random.choice(modes)
    chaos_result = selected_mode()
    
    # Always include the actual result (for debugging or easter eggs)
    if "actual_result" not in chaos_result or chaos_result["actual_result"] is None:
        chaos_result["actual_result"] = result
    chaos_result["input"] = expression
    
    return chaos_result


def safe_eval(expression):
    """
    Safely evaluate a mathematical expression.
    Only allows numbers and basic math operations.
    """
    # Define allowed characters and functions
    allowed_chars = set('0123456789+-*/.() ')
    allowed_names = {
        'sqrt': math.sqrt,
        'sin': math.sin,
        'cos': math.cos,
        'tan': math.tan,
        'log': math.log10,
        'ln': math.log,
        'pi': math.pi,
        'e': math.e,
        'abs': abs,
        'pow': pow,
    }
    
    # Clean the expression
    clean_expr = expression.replace('^', '**').replace('×', '*').replace('÷', '/')
    
    # Check for disallowed characters (excluding function names)
    expr_without_funcs = clean_expr
    for func_name in allowed_names.keys():
        expr_without_funcs = expr_without_funcs.replace(func_name, '')
    
    if not all(c in allowed_chars for c in expr_without_funcs):
        raise ValueError("Invalid characters in expression")
    
    try:
        # Evaluate with limited namespace
        result = eval(clean_expr, {"__builtins__": {}}, allowed_names)
        return float(result)
    except ZeroDivisionError:
        # Re-raise ZeroDivisionError to be caught by calculate() for black hole easter egg
        raise ZeroDivisionError("Division by zero")
    except Exception as e:
        raise ValueError(f"Could not evaluate expression: {str(e)}")


# =============================================================================
# STATIC FILE ROUTES (Serve Frontend)
# =============================================================================

@app.route('/')
def serve_index():
    """Serve the main index.html file."""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve other static files (CSS, JS, etc.)."""
    return send_from_directory(app.static_folder, path)


# =============================================================================
# API ROUTES
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the server is running."""
    return jsonify({
        'status': 'ok',
        'message': 'The Useless Calculator backend is running!'
    })


@app.route('/api/calculate', methods=['POST'])
def calculate():
    """
    Main calculation endpoint.
    Receives mathematical expression and returns chaotic results.
    
    Request body:
    {
        "expression": "2 + 2"
    }
    
    Response:
    {
        "input": "2 + 2",
        "output": "...",
        "mode": "gaslighting" | "unit_hell" | "time_traveler" | etc.
        "actual_result": 4
    }
    """
    try:
        data = request.get_json()
        
        # Handle missing or invalid JSON body
        if not data or 'expression' not in data:
            empty_responses = [
                "Feed me numbers! 🍽️",
                "The calculator hungers for digits...",
                "You gave me nothing. I give you nothing. We're even.",
                "Error 0: Zero input detected. Zero effort returned.",
                "*taps microphone* Is this thing on?",
            ]
            return jsonify({
                'output': random.choice(empty_responses),
                'message': 'No expression provided',
                'input': '',
                'mode': 'empty_input',
                'actual_result': None
            }), 200
        
        expression = data.get('expression', '').strip()
        
        # Handle empty expression
        if not expression:
            empty_responses = [
                "Feed me numbers! 🍽️",
                "The void stares back at you. 👁️",
                "You pressed equals on... nothing? Bold move.",
                "Nice try, but I need actual math.",
                "🦗 *cricket sounds* 🦗",
                "The calculator awaits your numerical offerings.",
            ]
            return jsonify({
                'output': random.choice(empty_responses),
                'message': 'Empty expression',
                'input': expression,
                'mode': 'empty_input',
                'actual_result': None
            }), 200
        
        # =====================================================
        # PRIORITY: Check for Easter Eggs BEFORE doing math
        # =====================================================
        easter_egg_response = check_easter_eggs(expression)
        if easter_egg_response:
            # Update stats even for easter eggs
            try:
                stats = GlobalStats.query.first()
                if stats:
                    stats.sevens_pressed += expression.count('7')
                    stats.calculations_performed += 1
                    stats.time_wasted += random.randint(5, 30)
                    db.session.commit()
            except Exception as e:
                print(f'Stats update error: {e}')
            return jsonify(easter_egg_response)
        
        # =====================================================
        # Try to calculate the math (with special error handling)
        # =====================================================
        try:
            result = safe_eval(expression)
        except ZeroDivisionError:
            # Special Easter Egg: Division by zero = Black Hole
            try:
                stats = GlobalStats.query.first()
                if stats:
                    stats.calculations_performed += 1
                    stats.time_wasted += random.randint(10, 60)  # Black holes waste more time
                    db.session.commit()
            except Exception as e:
                print(f'Stats update error: {e}')
            return jsonify({
                'output': "You've created a black hole. Thanks. 🕳️",
                'message': "DIVISION BY ZERO DETECTED",
                'input': expression,
                'mode': 'easter_egg',
                'actual_result': float('inf'),
                'easter_egg': 'black_hole'
            })
        
        # Generate chaotic response
        chaos_response = generate_chaos(result, expression)
        
        # Update Global Stats (The Useless Leaderboard)
        try:
            stats = GlobalStats.query.first()
            if stats:
                # Count how many 7s appear in the input
                sevens_count = expression.count('7')
                stats.sevens_pressed += sevens_count
                stats.calculations_performed += 1
                stats.time_wasted += random.randint(5, 30)  # Random 5-30 seconds "wasted"
                db.session.commit()
        except Exception as e:
            print(f'Stats update error: {e}')
        
        return jsonify(chaos_response)
    
    except ValueError as e:
        # Return a funny response for invalid expressions (200 OK, not 400)
        funny_errors = [
            "SYNTAX ERROR (but funnier) 🤪",
            "Math.exe has stopped working 💀",
            "The calculator union has rejected this equation ✊",
            "Error: Your math teacher would be disappointed 📚",
            "This expression hurt the calculator's feelings 😢",
            "Nice try, human. That's not math. 🤖",
            "I'm a calculator, not a miracle worker! 🧙",
        ]
        return jsonify({
            'output': random.choice(funny_errors),
            'message': str(e),
            'input': expression if 'expression' in dir() else '',
            'mode': 'invalid_input',
            'actual_result': None
        }), 200
    except Exception as e:
        # Catch-all for any unexpected errors (still return 200 with funny message)
        return jsonify({
            'output': 'Something went wrong in the chaos engine 🔥',
            'message': str(e),
            'input': expression if 'expression' in dir() else '',
            'mode': 'chaos_error',
            'actual_result': None
        }), 200


# =============================================================================
# GLOBAL MEMORY (M+ / MR) ROUTES
# =============================================================================

@app.route('/api/memory/save', methods=['POST'])
def memory_save():
    """
    M+ (Memory Plus) - Save a value to the GLOBAL memory pool.
    
    Request body:
    {
        "value": "42",
        "session_id": "optional-user-session-id"
    }
    """
    data = request.get_json()
    
    if not data or 'value' not in data:
        return jsonify({
            'error': 'No value provided',
            'message': 'Please send a JSON body with a "value" field.'
        }), 400
    
    value = str(data.get('value', ''))
    session_id = data.get('session_id', None)
    
    # Save to global memory
    new_memory = GlobalMemory(
        value=value,
        user_session=session_id
    )
    db.session.add(new_memory)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Value "{value}" has been saved to the void.',
        'warning': 'You may never see this number again.'
    })


@app.route('/api/memory/recall', methods=['GET'])
def memory_recall():
    """
    MR (Memory Recall) - Get a RANDOM value from the global pool.
    You will NOT get your own number back (unless you're very unlucky).
    """
    # Get optional session_id to try to exclude user's own values
    session_id = request.args.get('session_id', None)
    
    # Query all memories, optionally excluding the current user's
    if session_id:
        # Try to get someone else's memory first
        other_memories = GlobalMemory.query.filter(
            GlobalMemory.user_session != session_id
        ).all()
        
        if other_memories:
            random_memory = random.choice(other_memories)
        else:
            # Fallback: if no other memories exist, get any memory
            all_memories = GlobalMemory.query.all()
            if all_memories:
                random_memory = random.choice(all_memories)
            else:
                return jsonify({
                    'success': False,
                    'value': None,
                    'message': 'The void is empty. No one has saved anything yet.'
                })
    else:
        # No session provided, just get any random memory
        all_memories = GlobalMemory.query.all()
        if not all_memories:
            return jsonify({
                'success': False,
                'value': None,
                'message': 'The void is empty. No one has saved anything yet.'
            })
        random_memory = random.choice(all_memories)
    
    return jsonify({
        'success': True,
        'value': random_memory.value,
        'message': 'Retrieved from a stranger\'s memory.',
        'saved_at': random_memory.saved_at.isoformat()
    })


@app.route('/api/memory/count', methods=['GET'])
def memory_count():
    """Get the total number of memories in the void."""
    count = GlobalMemory.query.count()
    return jsonify({
        'count': count,
        'message': f'{count} numbers are floating in the void.'
    })


# =============================================================================
# USELESS LEADERBOARD API
# =============================================================================

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """
    Get global useless statistics for the leaderboard ticker.
    Returns:
    {
        "sevens_pressed": int,
        "calculations_performed": int,
        "time_wasted": int (seconds),
        "time_wasted_formatted": str (human readable)
    }
    """
    stats = GlobalStats.query.first()
    if not stats:
        return jsonify({
            'sevens_pressed': 0,
            'calculations_performed': 0,
            'time_wasted': 0,
            'time_wasted_formatted': '0 seconds'
        })
    
    # Format time wasted in human readable format
    seconds = stats.time_wasted
    if seconds < 60:
        time_str = f"{seconds} seconds"
    elif seconds < 3600:
        minutes = seconds // 60
        time_str = f"{minutes} minute{'s' if minutes != 1 else ''}"
    elif seconds < 86400:
        hours = seconds // 3600
        time_str = f"{hours} hour{'s' if hours != 1 else ''}"
    else:
        days = seconds // 86400
        time_str = f"{days} day{'s' if days != 1 else ''}"
    
    return jsonify({
        'sevens_pressed': stats.sevens_pressed,
        'calculations_performed': stats.calculations_performed,
        'time_wasted': stats.time_wasted,
        'time_wasted_formatted': time_str
    })


# =============================================================================
# RUN THE APP
# =============================================================================

if __name__ == '__main__':
    app.run(debug=True, port=5000)
