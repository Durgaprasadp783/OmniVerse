from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import get_current_user
from app.services.analytics_service import get_user_analytics

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Get user document and chat analytics summary",
)
async def get_analytics(
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve document metrics, page counts, chunk stats, word counts,
    total questions asked, and top asked topics.
    """
    user_id = str(current_user["_id"])
    try:
        data = await get_user_analytics(user_id=user_id)
        return data
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate analytics: {str(err)}",
        )
