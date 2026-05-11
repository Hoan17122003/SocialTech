using System;

namespace SocialBackEnd.Common.Constants;

public static class Constant
{
    public const string PrefixAuth = "Bearer";
    public const string PrefixRequestForgetPassword = "ForgetPassword:";
    public const string URLVALIDATEPASSWORD = "http://localhost:3000/forgetpassword-validate";
    public const string PrefixArticle = "https://yourapp.com/Article/detail";
    public const string PrefixAuthorLink = "https://yourapp.com/User/profile";
    public const string ReleativePathRoot = "";
    public static class GeminiConfigModel25Flash
    {
        public const string Model = "gemini-2.5-flash";
        // tasking easy for model
        public const string SystemInstructionGenerateTopicAttributesForArticle = "You are a helpful assistant for classifying posts that users upload on social media. You will be given a post (including images and content). The classification attributes are concise and detailed to further develop the recommendation feature in the system based on the attributes you classify, so please classify accurately.";
        public const string SystemInstructionGenerateValidateContent = "You are a helpful assistant for validating the content that users upload on social media.";
        public const string PromptValidateContent = "You will be given a post (including images and content). Please validate if the content is appropriate for posting on social media. If the content is inappropriate, please explain which part of the content is inappropriate and why. Content post and image : ";
        public const int QuotaCooldownMinutes = 2;
        public const int MaxOutputTokens = 2048;
        public const float Temperature = 0.7f;
        public const string ApproveResult = "approve";
        public const string InAppropriateResult = "inappropriate";
    };

    public static class GeminiConfigModelGemini25Pro
    {
        public const string Model = "gemini-2.5-pro";
        public const int QuotaCooldownMinutes = 5;
        public const int MaxOutputTokens = 2048;
        public const float Temperature = 0.7f;
    };

    public static class ResponseStatusArticle
    {
        public const int BadParamOfArticle = 1;
        public const string BadParamMesssage = "Nội dung chứa thông tin nhạy cảm không phù hợp";
        public const int SuccessActionOfArticle = 2;
        public const string SuccessActionMessage = "Thao tác với bài viết thành công";
        public const int ForbidenOfArticle = 3;
        public const string ForbidenMessage = "Bạn không có quyền với hành động cập nhật bài viết này";
    }

    public static class ResponseStatusAccount
    {
        public const int SuccessParamOfAccount = 1;
        public const int ConfflictParamOfAccount = 2;

    }
}
