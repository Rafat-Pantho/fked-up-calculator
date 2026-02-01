from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class GlobalMemory(db.Model):
    """
    The 'M+' of Chaos - Global Shared Memory
    When a user saves a number, it goes into this global pool.
    When ANY user recalls (MR), they get a random stranger's number.
    """
    __tablename__ = 'global_memory'

    id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.String(100), nullable=False)  # The saved number/result
    saved_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_session = db.Column(db.String(50), nullable=True)  # Optional: track who saved it

    def __repr__(self):
        return f'<GlobalMemory {self.value}>'

    def to_dict(self):
        return {
            'id': self.id,
            'value': self.value,
            'saved_at': self.saved_at.isoformat()
        }


class Quote(db.Model):
    """
    Nonsense Quote Generator storage.
    Stores quotes with fake/misattributed authors.
    Supports dynamic placeholders like {current_date}.
    """
    __tablename__ = 'quotes'

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)  # The quote text (can contain {current_date})
    author = db.Column(db.String(100), nullable=False)  # The fake author
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Quote by {self.author}>'

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'author': self.author
        }


class UnitConversion(db.Model):
    """
    Unit Converter from Hell storage.
    Stores absurd unit conversions.
    """
    __tablename__ = 'unit_conversions'

    id = db.Column(db.Integer, primary_key=True)
    unit_name = db.Column(db.String(50), nullable=False)  # e.g., "giraffes", "bananas"
    unit_value = db.Column(db.Float, nullable=False)  # e.g., 5.5 (meters per giraffe)
    unit_description = db.Column(db.String(200), nullable=True)  # e.g., "tall"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<UnitConversion {self.unit_name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'unit_name': self.unit_name,
            'unit_value': self.unit_value,
            'unit_description': self.unit_description
        }


class Nonsense(db.Model):
    """
    Pure Nonsense storage.
    Stores complete gibberish strings.
    """
    __tablename__ = 'nonsense'

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(200), nullable=False)  # e.g., "Potato.", "Error: Number too crispy."
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Nonsense {self.text[:20]}>'

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text
        }


class GlobalStats(db.Model):
    """
    The Useless Leaderboard - Global Statistics
    Tracks meaningless stats that make users feel part of something bigger (but equally useless).
    """
    __tablename__ = 'global_stats'

    id = db.Column(db.Integer, primary_key=True)
    sevens_pressed = db.Column(db.Integer, default=0)  # Global count of 7s pressed
    calculations_performed = db.Column(db.Integer, default=0)  # Total calculations ever
    time_wasted = db.Column(db.Integer, default=0)  # Total seconds wasted by humanity
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<GlobalStats sevens={self.sevens_pressed} calcs={self.calculations_performed}>'

    def to_dict(self):
        return {
            'sevens_pressed': self.sevens_pressed,
            'calculations_performed': self.calculations_performed,
            'time_wasted': self.time_wasted
        }
