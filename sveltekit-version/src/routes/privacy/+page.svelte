<script lang="ts">
	import { TEXTS } from '$lib/data/texts';

</script>

<div class="container mx-auto max-w-2xl type-base p-6">
	<h1 class="text-3xl font-bold mb-6 text-primary-600">{TEXTS.PRIVACY_TITLE}</h1>
    
    <div class="prose prose-lg text-gray-700">
        <p class="font-bold">{TEXTS.PRIVACY_UPDATED_AT}</p>

        <p>
            {TEXTS.PRIVACY_WELCOME_PREFIX} <strong>"{TEXTS.APP_TITLE}"</strong>.
            {TEXTS.PRIVACY_WELCOME_SUFFIX}
        </p>

        <h3>{TEXTS.PRIVACY_SECTION_1_TITLE}</h3>
        <p>
            {TEXTS.PRIVACY_SECTION_1_PREFIX}<strong>{TEXTS.PRIVACY_DOES_NOT}</strong>{TEXTS.PRIVACY_SECTION_1_SUFFIX}
        </p>

        <h3>{TEXTS.PRIVACY_SECTION_2_TITLE}</h3>
        <p>
            {TEXTS.PRIVACY_SECTION_2_INTRO}
        </p>
        <ul class="list-disc pr-6">
            <li>
                <code>https://www.googleapis.com/auth/drive.file</code>: {TEXTS.PRIVACY_SECTION_2_SCOPE_DESC_PREFIX}<strong>{TEXTS.PRIVACY_ONLY}</strong>{TEXTS.PRIVACY_SECTION_2_SCOPE_DESC_SUFFIX}
            </li>
        </ul>
        <p>
            {TEXTS.PRIVACY_SECTION_2_COMPLIANCE_PREFIX}<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" class="text-blue-600 hover:underline">{TEXTS.PRIVACY_SECTION_2_COMPLIANCE_LINK_LABEL}</a>{TEXTS.PRIVACY_SECTION_2_COMPLIANCE_SUFFIX}
        </p>

        <h3>{TEXTS.PRIVACY_SECTION_3_TITLE}</h3>
        <p>
            {TEXTS.PRIVACY_SECTION_3_BODY}
        </p>

        <h3>{TEXTS.PRIVACY_SECTION_4_TITLE}</h3>
        <p>
            {TEXTS.PRIVACY_SECTION_4_BODY}
        </p>

        <div class="mt-12 pt-6 border-t border-gray-200">
            <a href="/" class="text-primary-600 hover:underline font-bold">{TEXTS.PRIVACY_BACK_HOME}</a>
        </div>
    </div>
</div>
