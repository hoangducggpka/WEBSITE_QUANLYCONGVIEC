# apps/skills/serializers.py
from rest_framework import serializers
from .models import Skill, UserSkill

class SkillSerializer(serializers.ModelSerializer):

    skill_uuid = serializers.UUIDField(source="skill.uuid", read_only=True)
    name = serializers.CharField(source="skill.name", read_only=True)
    category = serializers.CharField(source="skill.category", read_only=True)

    class Meta:
        model = UserSkill
        fields = [
            "skill_uuid",
            "name",
            "category",
            "level",
            "years_of_experience",
            "verified"
        ]