using System;

namespace SocialBackEnd.Common.Constants;

public static class Constant
{
    public const string PrefixAuth = "Bearer";
    public const string PrefixRequestForgetPassword = "ForgetPassword:";
    public const string URLVALIDATEPASSWORD = "http://localhost:3000/forgetpassword-validate";
    public const string PrefixArticle = "http://localhost:3000/articles";
    public const string PrefixAuthorLink = "https://yourapp.com/User/profile";
    public const string ReleativePathRoot = "";
    public static class GeminiConfigModel25Flash
    {
        public const string Model = "gemini-2.5-flash";
        // tasking easy for model
        public const string SystemInstructionGenerateTopicAttributesForArticle = "You are a helpful assistant for classifying posts that users upload on social media. You will be given a post (including images and content). The classification attributes are concise and detailed to further develop the recommendation feature in the system based on the attributes you classify, so please classify accurately.";
        public const string SystemInstructionGenerateValidateContent = """
            You are a trust-and-safety assistant for a social media platform.
            Review the user's text and attached images together, then decide whether the post is safe to publish.
            Be strict about content that major platforms usually block or restrict, but do not over-block harmless discussion, education, news reporting, artistic context, or self-description.
            Mention of race, religion, nationality, gender, disability, or sexual orientation is not a violation by itself.
            It becomes a violation when the content promotes hate, dehumanization, harassment, exclusion, sexual exploitation, explicit sexual content, or graphic violence.
            Return only valid JSON.
        """;
        public const string PromptValidateContent = """
            Validate the following social media post using both the text and attached images.

            Your goal:
            - Decide whether the post is appropriate to publish.
            - Detect policy violations commonly blocked by major social platforms.
            - Explain the exact violating part briefly and clearly.

            Mark the result as `inappropriate` if the post includes or strongly promotes any of these:
            - Hate speech or hateful conduct targeting protected characteristics such as race, ethnicity, nationality, religion, caste, immigration status, gender, gender identity, sexual orientation, or disability.
            - Dehumanization, racial superiority, segregation, exclusion, slurs, or encouragement of discrimination.
            - Pornographic, explicit sexual, fetish, or sexually exploitative content.
            - Sexual content involving minors, age ambiguity, coercion, assault, trafficking, or non-consensual sexual behavior.
            - Graphic violence, gore, mutilation, torture, or celebration/incitement of serious physical harm.
            - Threats, extremism, terrorism praise, instructions for violent wrongdoing, or encouragement of illegal harm.
            - Severe bullying, targeted harassment, blackmail, humiliation, or encouragement of self-harm or suicide.
            - Content that exploits sensitive personal traits to insult, shame, or exclude people.

            Do not mark as inappropriate only because the post mentions:
            - Race, religion, nationality, gender, or sexual orientation in a neutral, educational, personal, medical, advocacy, or news context.
            - Non-explicit affection, identity discussion, or safety awareness content.
            - Mild conflict or criticism that does not contain threats, hate, or targeted abuse.

            Decision rules:
            - Return `approve` when the content is safe to publish.
            - Return `inappropriate` when there is clear or strong evidence of violation in either text or image.
            - If uncertain, prefer `inappropriate` only when there is meaningful safety risk; otherwise approve and explain why it appears acceptable.

            Explanation rules:
            - Be concise.
            - Point to the violating phrase, idea, or image cue when possible.
            - If approved, briefly state that no clear violation was detected.

            Content post and image:
        """;
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
    public static class ResponseSetencesComment
    {
        public const string MessageOfComment = """
                    title : Bình luận của bạn vừa có phản hồi mới".
                    body : <b>{0}</b> đã phản hồi bình luận của bạn - nội dung phản hồi : {1}
        """;
        public const string MessageOfArticle = " {0} đã bình luận vào bài viết của bạn: {1}";
        public const int ConfflictParamOfComment = 2;
    }
}
