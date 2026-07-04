package middleware

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        tokenString, err := c.Cookie("access_token")
        if err != nil {
            c.AbortWithStatusJSON(401, gin.H{"message": "No token, silakan login"})
            return
        }

        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            return config.JwtSecret, nil
        })
        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(401, gin.H{"message": "Invalid token"})
            return
        }

        claims, ok := token.Claims.(jwt.MapClaims)
        if !ok {
            c.AbortWithStatusJSON(401, gin.H{"message": "Invalid token claims"})
            return
        }

        var userID uint
        switch v := claims["user_id"].(type) {
        case float64:
            userID = uint(v)
        case string:
            id, _ := strconv.ParseUint(v, 10, 32)
            userID = uint(id)
        default:
            c.AbortWithStatusJSON(401, gin.H{"message": "Invalid user_id format"})
            return
        }        

        var user models.User
        if err := config.DB.First(&user, userID).Error; err != nil {
            c.AbortWithStatusJSON(401, gin.H{"message": "User not found"})
            return
        }

        c.Set("user_id", userID)
        c.Set("user", user)
        c.Set("role", string(user.Role))

        c.Next()
    }
}


func EmailVerifiedMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		userData, exists := c.Get("user")
		if !exists {
			c.AbortWithStatusJSON(401, gin.H{"message": "Unauthorized"})
			return
		}

		user := userData.(models.User)

		if !user.EmailVerified {
			c.AbortWithStatusJSON(403, gin.H{
				"message": "Email belum diverifikasi",
				"code":    "EMAIL_NOT_VERIFIED",
			})
			return
		}

		c.Next()
	}
}