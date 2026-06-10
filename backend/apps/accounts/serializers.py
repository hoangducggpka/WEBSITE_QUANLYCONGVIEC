#apps/accounts/serializers.py
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile
import uuid

class AvatarUpdateSerializer(serializers.ModelSerializer):
    avatarpath = serializers.ImageField(required=True)
    class Meta:
        model = UserProfile
        fields = ["avatarpath"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    fullname = serializers.CharField(write_only=True, required=True)
    address = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)
    phone = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'fullname', 'phone', 'address']

    def create(self, validated_data):
        fullname = validated_data.pop('fullname')
        address = validated_data.pop('address', None)
        phone = validated_data.pop('phone', None)

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )

        UserProfile.objects.create(
            user=user,
            fullname=fullname,
            address=address,
            phone=phone,
        )

        return user
    
class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    is_staff = serializers.BooleanField(source="user.is_staff", read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "uuid",
            "username",
            "email",
            "is_staff",
            "user_code",
            "fullname",
            "address",
            "phone",
            "avatarpath",
            "reliability_score"
        ]

class ProfileUpdateSerializer(serializers.ModelSerializer):
    email    = serializers.EmailField(source="user.email", required=False)
    user_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model  = UserProfile
        fields = ["fullname", "address", "phone", "user_code", "email"]  # user_code đã có sẵn

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})

        # Cập nhật email trên User model
        new_email = validated_data.pop("email", None)
        if new_email is not None:
            instance.user.email = new_email
            instance.user.save()

        # Cập nhật tất cả field còn lại kể cả user_code
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance