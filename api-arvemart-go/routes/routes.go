package routes

import (
	"api-arveshop-go/config"
	"api-arveshop-go/controllers"
	"api-arveshop-go/middleware"
	"api-arveshop-go/websocket"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {	

	r.GET("/api/me", middleware.AuthMiddleware(), middleware.EmailVerifiedMiddleware(), controllers.Me)
	r.PUT("/api/me", middleware.AuthMiddleware(), middleware.EmailVerifiedMiddleware(), controllers.UpdateProfile)
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", controllers.Register)
		auth.POST("/login", controllers.Login)
		auth.POST("/refresh", controllers.RefreshToken)
		auth.POST("/logout", controllers.Logout)
		auth.GET("/verify", controllers.VerifyEmail)
		auth.GET("/check-verification", controllers.CheckVerification)
		auth.POST("/resend-verification", controllers.ResendVerification)
		auth.POST("/forgot-password", controllers.ForgotPassword)
		auth.POST("/reset-password", controllers.ResetPassword)
	}

	r.POST("/api/inquiry", controllers.Inquiry)

	r.GET("/api/categories", controllers.GetCategoriesHome)
	r.GET("/api/services", controllers.GetServiceHome)
	r.GET("/api/services/search", controllers.SearchService)
	r.GET("/api/services/popular", controllers.GetPopularServices)
	r.GET("/api/products/:slug", controllers.GetProductHome)
	r.GET("/api/service/:slug", controllers.GetPersonalService)
	r.GET("/api/pasca/:slug", controllers.GetPersonalPasca)
	r.GET("/api/payment-method", controllers.GetPaymentMethodActive)
	// r.POST("/api/create-transaction", controllers.CreateTransactionMidtrans)	//untuk midtrans
	r.POST("/api/create-transaction", controllers.CreateTransactionIpaymu)	//untuk ipaymu
	r.POST("/api/get-products", controllers.GetProducts)
	r.POST("/api/get-products-pasca", controllers.GetProductsPasca)
	r.GET("/api/history/:order_id", controllers.GetHistory)	

	// start websocket manager
	go websocket.Manager.Start()
	
	// WebSocket endpoint
	r.GET("/ws", controllers.WebSocketConnection)
	
	r.GET("/api/payment-status/:order_id", controllers.GetStatusPayment)
	r.POST("/api/payment-status/update", controllers.UpdatePaymentStatus)
	// r.POST("/api/webhook/midtrans", controllers.HandleMidtransWebhook)
	r.POST("/api/webhook/ipaymu", controllers.HandleIPaymuCallback)
	r.POST("/api/webhook/digiflazz", controllers.HandleDigiflazzWebhook)
	
	// r.POST("/api/webhook/duitku", controllers.HandleDuitkuWebhook)
	// r.POST("/api/create-transaction", controllers.CreateTransactionDuitku)
	r.GET("/api/payment-duitku", controllers.GetPaymentMethodDuitku)


	r.POST("/transaction/:orderid/expire", controllers.ExpireTransaction)
	r.POST("/api/transaction/:order_id/retry-with-number", middleware.AuthMiddleware(), controllers.RetryWithNumber)
	r.POST("/api/inquiry-pln", controllers.HandlePLNInquiry)
	
	r.GET("/api/history", middleware.AuthMiddleware(), middleware.RoleMiddleware("user"), controllers.GetHistoryCustomer)
	r.GET("/api/history/summary", middleware.AuthMiddleware(), middleware.RoleMiddleware("user"), controllers.GetHistorySummary)

	r.Static("/uploads", "./uploads")
			
	dc := controllers.NewDashboardController(config.DB)
	rc := controllers.NewReportController(config.DB)
	sc := controllers.NewSaldoController(config.DB)
	
	r.GET("/api/profil-aplikasi", controllers.GetProfilAplikasi)
	r.GET("/api/faq", controllers.GetFaqs)
	r.GET("/api/banners", controllers.GetBannersActive)
	r.GET("/api/transactions/recent", controllers.GetRecentTransactions)

	// Blog Public
	r.GET("/api/blog/categories", controllers.GetBlogCategoriesHome)
	r.GET("/api/blog/articles", controllers.GetBlogArticlesPublic)
	r.GET("/api/blog/articles/:slug", controllers.GetBlogArticleBySlug)
	r.GET("/api/blog/stories", controllers.GetBlogStoriesPublic)
	r.GET("/api/blog/stories/:slug", controllers.GetBlogStoryBySlug)
	r.GET("/api/blog/comments", controllers.GetBlogComments)
	r.POST("/api/blog/comments", controllers.CreateBlogComment)
	r.GET("/api/blog/ratings", controllers.GetBlogRatings)
	r.POST("/api/blog/ratings", controllers.CreateBlogRating)
	r.POST("/api/blog/views", controllers.RecordBlogView)
	r.POST("/api/vouchers/validate", controllers.ValidateVoucher)
	
	admin := r.Group("/api/admin")
	admin.Use(middleware.AuthMiddleware(), middleware.RoleMiddleware("superadmin"))
	{		
		admin.POST("/saldo/sync", sc.SyncSaldo)
		admin.GET("/report", rc.GetReport)
		admin.GET("/dashboard/stats", dc.GetStats)
		admin.GET("/dashboard/recent-transactions", dc.GetRecentTransactions)

		admin.GET("/products", controllers.GetProductsAdmin)
		admin.POST("/products", controllers.CreateProduct)
		admin.PUT("/products/:id", controllers.UpdateProduct)
		admin.DELETE("/products/:id", controllers.DeleteProduct)

		admin.POST("/products/sync", controllers.SyncProducts)


		admin.GET("/users", controllers.GetUsers)
		admin.POST("/users", controllers.CreateUser)
		admin.PUT("/users/:id", controllers.UpdateUser)
		admin.DELETE("/users/:id", controllers.DeleteUser)
		admin.GET("/profil-aplikasi", controllers.GetProfilAplikasi)
		admin.POST("/profil-aplikasi", controllers.CreateProfilAplikasi)
		admin.PUT("/profil-aplikasi/:id", controllers.UpdateProfilAplikasi)
		admin.PATCH("/profil-aplikasi/:id", controllers.UpdateProfilAplikasiPartial)
		admin.DELETE("/upload/logo", controllers.DeleteLogoCloudinary)
		
		admin.GET("/faq", controllers.GetFaqs)
		admin.POST("/faq", controllers.CreateFaq)
		admin.PUT("/faq/:id", controllers.UpdateFaq)
		admin.DELETE("/faq/:id", controllers.DeleteFaq)

		// Upload route
		admin.POST("/upload", controllers.UploadLogo)
		
		admin.GET("/banners", controllers.GetBanners)
		admin.POST("/banners", controllers.CreateBanner)
		admin.PUT("/banners/:id", controllers.UpdateBanner)
		admin.DELETE("/banners/:id", controllers.DeleteBanner)

		admin.GET("/categories", controllers.GetCategories)
		admin.POST("/categories", controllers.CreateCategory)
		admin.PUT("/categories/:id", controllers.UpdateCategory)
		admin.DELETE("/categories/:id", controllers.DeleteCategory)

		admin.GET("/services", controllers.GetServices)
		admin.DELETE("/services/:id", controllers.DeleteService)
		admin.POST("/services", controllers.CreateService)
		admin.PATCH("/services/:id", controllers.UpdateService)
		
		
		admin.GET("/payment-method", controllers.GetPaymentMethod)
		admin.POST("/payment-method", controllers.CreatePaymentMethod)
		admin.PUT("/payment-method/:id", controllers.UpdatePaymentMethod)
		admin.DELETE("/payment-method/:id", controllers.DeletePaymentMethod)

		
		admin.GET("/product-pasca", controllers.GetProductPasca)

		admin.GET("/transactions", controllers.GetAllTransaction)

		// Lihat SEMUA pending job
		admin.GET("/monitor/pending-jobs", controllers.GetPendingJobs)
		// Lihat semua job yang sedang retry:
		admin.GET("/monitor/retry-jobs", controllers.GetRetryJobsStatus)
		// Lihat ringkasan statistik:
		admin.GET("/monitor/retry-jobs/summary", controllers.GetRetryJobsSummary)
		// Lihat detail satu job:
		admin.GET("/monitor/retry-jobs/:order_id", controllers.GetRetryJobDetail)
		// Force retry manual (jika diperlukan):
		admin.POST("/monitor/retry-jobs/:order_id/force", controllers.ForceRetryJob)

		admin.GET("/vouchers", controllers.GetVouchers)
		admin.GET("/vouchers/:id", controllers.GetVoucher)
		admin.POST("/vouchers", controllers.CreateVoucher)
		admin.PUT("/vouchers/:id", controllers.UpdateVoucher)
		admin.DELETE("/vouchers/:id", controllers.DeleteVoucher)

		// Blog Management
		admin.GET("/blog/categories", controllers.GetBlogCategories)
		admin.POST("/blog/categories", controllers.CreateBlogCategory)
		admin.PUT("/blog/categories/:id", controllers.UpdateBlogCategory)
		admin.DELETE("/blog/categories/:id", controllers.DeleteBlogCategory)

		admin.GET("/blog/articles", controllers.GetBlogArticlesAdmin)
		admin.GET("/blog/articles/:id", controllers.GetBlogArticleByID)
		admin.POST("/blog/articles", controllers.CreateBlogArticle)
		admin.PUT("/blog/articles/:id", controllers.UpdateBlogArticle)
		admin.DELETE("/blog/articles/:id", controllers.DeleteBlogArticle)
		admin.PATCH("/blog/articles/:id/toggle", controllers.ToggleBlogArticle)

		admin.GET("/blog/stories", controllers.GetBlogStoriesAdmin)
		admin.GET("/blog/stories/:id", controllers.GetBlogStoryByID)
		admin.POST("/blog/stories", controllers.CreateBlogStory)
		admin.PUT("/blog/stories/:id", controllers.UpdateBlogStory)
		admin.DELETE("/blog/stories/:id", controllers.DeleteBlogStory)
		admin.PATCH("/blog/stories/:id/toggle", controllers.ToggleBlogStory)

		admin.GET("/blog/stories/:id/pages", controllers.GetBlogStoryPages)
		admin.POST("/blog/stories/:id/pages", controllers.CreateBlogStoryPage)
		admin.PUT("/blog/stories/:id/pages/:pageId", controllers.UpdateBlogStoryPage)
		admin.DELETE("/blog/stories/:id/pages/:pageId", controllers.DeleteBlogStoryPage)
		admin.PUT("/blog/stories/:id/pages/reorder", controllers.ReorderBlogStoryPages)

		admin.GET("/blog/comments", controllers.GetBlogCommentsAdmin)
		admin.DELETE("/blog/comments/:id", controllers.DeleteBlogComment)
		admin.PATCH("/blog/comments/:id/toggle", controllers.ToggleBlogComment)

		admin.POST("/blog/upload", controllers.UploadBlogImage)
	}
}
