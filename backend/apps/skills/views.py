# apps/skills/views.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Skill
from .serializers import SkillSerializer


class MySkillsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        skills = Skill.objects.filter(user=request.user)

        serializer = SkillSerializer(skills, many=True)

        return Response(serializer.data)

class DeleteUserSkillView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, skill_uuid):
        try:
            skill = Skill.objects.get(uuid=skill_uuid)
        except Skill.DoesNotExist:
            return Response({"error": "Không tìm thấy skill"}, status=status.HTTP_404_NOT_FOUND)

        # Kiểm tra quyền của user
        if skill.user != request.user:
            return Response({"error": "Bạn không có quyền xóa skill này!"}, status=status.HTTP_403_FORBIDDEN)

        skill.delete()
        return Response({"message": "Đã xóa skill!"}, status=status.HTTP_200_OK)
    
from rest_framework import status

class CreateSkillView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get("name")
        if not name:
            return Response({"error": "Skill name is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Kiểm tra user đã có skill này chưa
        existing = Skill.objects.filter(user=request.user, name__iexact=name).first()
        if existing:
            return Response({"error": "Skill already exists for this user"}, status=status.HTTP_400_BAD_REQUEST)

        skill = Skill.objects.create(user=request.user, name=name)

        return Response({
            "message": "Skill created",
            "skill": {
                "uuid": skill.uuid,
                "name": skill.name,
                "user_id": skill.user.id
            }
        }, status=status.HTTP_201_CREATED)