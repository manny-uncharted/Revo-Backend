# 🗄️ Database Migrations for Farmers Marketplace

This guide helps contributors work with database migrations using Alembic.

## 🚀 Basic Commands

### Create New Migration
```bash
# Using Makefile (recommended)
make migration name="add_farmers_table"

# Or directly with alembic
alembic revision --autogenerate -m "add_farmers_table"
```

### Apply Migrations
```bash
# Using Makefile
make migrate

# Or directly with alembic
alembic upgrade head
```

### View Migration Status
```bash
# View history
alembic history --verbose

# View current migration
alembic current

# View pending migrations
alembic show head
```

## 🏗️ Migration Structure

Each migration should follow this pattern:

```python
"""add_farmers_table

Revision ID: 001
Revises: 
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Create farmers table for agricultural marketplace."""
    op.create_table(
        'farmers',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('farm_name', sa.String(255), nullable=False),
        sa.Column('farm_size', sa.Float, nullable=True),
        sa.Column('organic_certified', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, onupdate=sa.func.now()),
    )

def downgrade() -> None:
    """Drop farmers table."""
    op.drop_table('farmers')
```

## ⚠️ Important Considerations

1. **Dependency Order**: Create tables in correct order (users → farmers → products → orders)
2. **Seed Data**: Include sample data for agricultural product categories
3. **Geospatial Indexes**: Use PostGIS for proximity searches
4. **Constraints**: Add business validations (e.g., farm_size > 0)

## 🔧 Development Commands

```bash
# Reset database (CAREFUL: deletes everything)
alembic downgrade base
alembic upgrade head

# View migration SQL without executing
alembic upgrade head --sql

# Create empty migration for manual changes
alembic revision -m "manual_changes"
```

## 📖 References

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Column Types](https://docs.sqlalchemy.org/en/14/core/type_basics.html)
- [PostGIS with SQLAlchemy](https://geoalchemy-2.readthedocs.io/) 